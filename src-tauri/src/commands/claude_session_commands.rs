//! Claude session commands
//!
//! Tauri commands for accessing Claude Code session data.

use crate::services::session_cache::SessionDetailCache;
use crate::services::ClaudeSessionService;
use crate::types::{ClaudeSessionDetail, ClaudeSessionPage};
use tauri::{AppHandle, Manager};

/// Get paginated Claude Code sessions for a project or all projects.
#[tauri::command]
pub fn get_claude_sessions_page(
    project_path: Option<String>,
    offset: usize,
    limit: usize,
) -> Result<ClaudeSessionPage, String> {
    ClaudeSessionService::get_sessions_page(project_path.as_deref(), offset, limit)
        .map_err(|e| e.to_string())
}

/// Get Claude Code session detail with messages
#[tauri::command]
pub fn get_claude_session_detail(
    app_handle: AppHandle,
    session_path: String,
) -> Result<ClaudeSessionDetail, String> {
    // Check cache first
    if let Some(cache) = app_handle.try_state::<SessionDetailCache>() {
        if let Some(cached) = cache.get(&session_path) {
            return Ok(cached);
        }
    }

    let detail =
        ClaudeSessionService::get_session_detail(&session_path).map_err(|e| e.to_string())?;

    // Store in cache
    if let Some(cache) = app_handle.try_state::<SessionDetailCache>() {
        cache.set(&session_path, detail.clone());
    }

    Ok(detail)
}
