//! Session file watcher
//!
//! Watches `~/.claude/projects/` for changes to session files (.jsonl) and
//! session index files, then emits Tauri events so the frontend can refresh
//! in real time.

use crate::services::session_cache::SessionDetailCache;
use notify::{EventKind, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

const DEBOUNCE_MS: u64 = 200;
const RETRY_INTERVAL: Duration = Duration::from_secs(5);

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionFileChangedPayload {
    pub session_id: String,
    pub file_path: String,
}

/// Start the session file watcher.
/// Should be spawned after the database is initialized.
pub fn start(app_handle: AppHandle) {
    tokio::task::spawn_blocking(move || {
        run_watcher(app_handle);
    });
}

fn claude_projects_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".claude").join("projects"))
}

fn run_watcher(app_handle: AppHandle) {
    loop {
        let Some(watch_dir) = claude_projects_dir() else {
            log::warn!("Session watcher: could not determine home directory, retrying...");
            std::thread::sleep(RETRY_INTERVAL);
            continue;
        };

        if !watch_dir.exists() {
            log::info!(
                "Session watcher: {} does not exist yet, retrying in {}s...",
                watch_dir.display(),
                RETRY_INTERVAL.as_secs()
            );
            std::thread::sleep(RETRY_INTERVAL);
            continue;
        }

        log::info!("Session watcher: watching {}", watch_dir.display());

        let (tx, rx) = mpsc::channel();

        let mut watcher = match notify::recommended_watcher(tx) {
            Ok(w) => w,
            Err(e) => {
                log::error!("Session watcher: failed to create watcher: {}", e);
                std::thread::sleep(RETRY_INTERVAL);
                continue;
            }
        };

        if let Err(e) = watcher.watch(&watch_dir, RecursiveMode::Recursive) {
            log::error!("Session watcher: failed to watch directory: {}", e);
            std::thread::sleep(RETRY_INTERVAL);
            continue;
        }

        let mut last_emitted: HashMap<PathBuf, Instant> = HashMap::new();

        loop {
            match rx.recv_timeout(Duration::from_millis(500)) {
                Ok(Ok(event)) => {
                    if !matches!(
                        event.kind,
                        EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)
                    ) {
                        continue;
                    }

                    for path in event.paths {
                        handle_path_change(&path, &app_handle, &mut last_emitted);
                    }
                }
                Ok(Err(e)) => {
                    log::warn!("Session watcher: watch error: {}", e);
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    // Check if directory still exists
                    if !watch_dir.exists() {
                        log::info!(
                            "Session watcher: watch directory removed, restarting watcher..."
                        );
                        break;
                    }
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    log::warn!("Session watcher: channel disconnected, restarting watcher...");
                    break;
                }
            }
        }

        std::thread::sleep(RETRY_INTERVAL);
    }
}

fn handle_path_change(
    path: &PathBuf,
    app_handle: &AppHandle,
    last_emitted: &mut HashMap<PathBuf, Instant>,
) {
    let file_name = match path.file_name().and_then(|f| f.to_str()) {
        Some(name) => name.to_string(),
        None => return,
    };

    // Debounce: skip if we emitted for this path within the debounce window
    let now = Instant::now();
    if let Some(last) = last_emitted.get(path) {
        if now.duration_since(*last) < Duration::from_millis(DEBOUNCE_MS) {
            return;
        }
    }
    last_emitted.insert(path.clone(), now);

    if file_name == "sessions-index.json" {
        log::info!("Session watcher: sessions index changed");
        if let Err(e) = app_handle.emit("sessions-list-changed", ()) {
            log::warn!(
                "Session watcher: failed to emit sessions-list-changed: {}",
                e
            );
        }
    } else if file_name.ends_with(".jsonl") {
        let session_id = file_name.trim_end_matches(".jsonl").to_string();
        let file_path_str = path.to_string_lossy().to_string();
        log::info!("Session watcher: session file changed: {}", session_id);

        // Invalidate cache for this file
        if let Some(cache) = app_handle.try_state::<SessionDetailCache>() {
            cache.invalidate(&file_path_str);
        }

        // Emit session-file-changed for detail view updates
        if let Err(e) = app_handle.emit(
            "session-file-changed",
            SessionFileChangedPayload {
                session_id,
                file_path: file_path_str,
            },
        ) {
            log::warn!(
                "Session watcher: failed to emit session-file-changed: {}",
                e
            );
        }

        // Also emit sessions-list-changed since metadata (message count, etc.) may have changed
        if let Err(e) = app_handle.emit("sessions-list-changed", ()) {
            log::warn!(
                "Session watcher: failed to emit sessions-list-changed: {}",
                e
            );
        }
    }
}
