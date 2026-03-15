//! Notification poller
//!
//! Background task that polls for unnotified notifications and sends
//! macOS native notifications via the Tauri notification plugin.
//! Respects per-event notification settings with fallback resolution.
//!
//! The global '*' setting acts as a master override:
//! - If global enabled=false, all notifications are suppressed.
//! - If global play_sound=false, sound is suppressed even if per-event has it on.
//! - If global show_banner=false, banners are suppressed globally.

use shared::{Notification, NotificationRepository, NotificationSettingRepository};
use sqlx::SqlitePool;
use std::path::Path;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

const POLL_INTERVAL: Duration = Duration::from_secs(3);

/// Start the notification polling loop.
/// Should be spawned after the database is initialized.
pub fn start(app_handle: AppHandle) {
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(POLL_INTERVAL).await;
            if let Err(e) = poll_and_notify(&app_handle).await {
                log::error!("Notification poller error: {}", e);
            }
        }
    });
}

async fn poll_and_notify(app_handle: &AppHandle) -> anyhow::Result<()> {
    let pool = app_handle.state::<SqlitePool>();
    let pending = NotificationRepository::find_unnotified(&pool).await?;

    if pending.is_empty() {
        return Ok(());
    }

    let ids: Vec<i64> = pending.iter().map(|n| n.id).collect();

    // Load global master settings
    let global = NotificationSettingRepository::find_by_hook_event(&pool, "*").await?;
    let (global_enabled, global_banner, global_sound) = match &global {
        Some(g) => (g.enabled, g.show_banner, g.play_sound),
        None => (true, true, true),
    };

    if !global_enabled {
        NotificationRepository::mark_notified(&pool, &ids).await?;
        return Ok(());
    }

    for notif in &pending {
        let setting = NotificationSettingRepository::find_effective(
            &pool,
            &notif.hook_event,
            notif.notification_type.as_deref(),
        )
        .await?;

        let (enabled, show_banner, play_sound) = match &setting {
            Some(s) => (s.enabled, s.show_banner, s.play_sound),
            None => (true, true, true),
        };

        if !enabled {
            continue;
        }

        // Apply global overrides
        let show_banner = show_banner && global_banner;
        let play_sound = play_sound && global_sound;

        if !show_banner && !play_sound {
            continue;
        }

        let (title, body) = format_notification(notif);

        if show_banner {
            let mut builder = app_handle
                .notification()
                .builder()
                .title(&title)
                .body(&body);

            if play_sound {
                builder = builder.sound("default");
            }

            if let Err(e) = builder.show() {
                log::warn!("Failed to send OS notification: {}", e);
            }
        } else if play_sound {
            if let Err(e) = app_handle.notification().builder().sound("default").show() {
                log::warn!("Failed to play notification sound: {}", e);
            }
        }
    }

    NotificationRepository::mark_notified(&pool, &ids).await?;
    log::info!("Sent {} OS notification(s)", ids.len());

    Ok(())
}

/// Format a notification for display as an OS notification banner.
///
/// - Notification events: use Claude Code's original title/message.
/// - Stop: "Claude Code" / "Task completed · {project}"
/// - SubagentStop: "Claude Code" / "{agent} completed · {project}"
fn format_notification(notif: &Notification) -> (String, String) {
    match notif.hook_event.as_str() {
        "Notification" => {
            let title = if notif.title.is_empty() {
                "Claude Code".to_string()
            } else {
                notif.title.clone()
            };
            let body = if notif.message.is_empty() {
                "Claude Code needs your attention.".to_string()
            } else {
                notif.message.clone()
            };
            (title, body)
        }
        "Stop" => {
            let project = extract_project_name(notif.cwd.as_deref());
            ("Claude Code".to_string(), format!("Task completed · {}", project))
        }
        "SubagentStop" => {
            let agent = notif.agent_type.as_deref().unwrap_or("Subagent");
            let project = extract_project_name(notif.cwd.as_deref());
            (
                "Claude Code".to_string(),
                format!("{} completed · {}", agent, project),
            )
        }
        _ => {
            let title = if notif.title.is_empty() {
                "Claude Code".to_string()
            } else {
                notif.title.clone()
            };
            let body = if notif.message.is_empty() {
                extract_project_name(notif.cwd.as_deref())
            } else {
                notif.message.clone()
            };
            (title, body)
        }
    }
}

/// Extract the project name from a cwd path.
/// Walks up from the cwd looking for a `.git` directory to find the repo root.
/// Falls back to the last path component.
fn extract_project_name(cwd: Option<&str>) -> String {
    let Some(cwd) = cwd else {
        return "Unknown".to_string();
    };

    let path = Path::new(cwd);

    // Walk up looking for .git directory (repo root)
    let mut current = Some(path);
    while let Some(dir) = current {
        if dir.join(".git").exists() {
            if let Some(name) = dir.file_name().and_then(|n| n.to_str()) {
                return name.to_string();
            }
        }
        current = dir.parent();
    }

    // No git repo found — use last path component
    path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string()
}
