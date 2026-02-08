//! Claude session commands
//!
//! Tauri commands for accessing Claude Code session data.

use crate::services::ClaudeSessionService;
use crate::types::{ClaudeProjectSummary, ClaudeSession, ClaudeSessionDetail};

/// Get all Claude Code sessions
#[tauri::command]
pub fn get_claude_sessions() -> Result<Vec<ClaudeSession>, String> {
    ClaudeSessionService::get_all_sessions().map_err(|e| e.to_string())
}

/// Get Claude projects summary
#[tauri::command]
pub fn get_claude_projects() -> Result<Vec<ClaudeProjectSummary>, String> {
    ClaudeSessionService::get_projects_summary().map_err(|e| e.to_string())
}

/// Get Claude Code sessions for a specific project
#[tauri::command]
pub fn get_claude_sessions_for_project(project_path: String) -> Result<Vec<ClaudeSession>, String> {
    ClaudeSessionService::get_sessions_for_project(&project_path).map_err(|e| e.to_string())
}

/// Get Claude Code session detail with messages
#[tauri::command]
pub fn get_claude_session_detail(session_path: String) -> Result<ClaudeSessionDetail, String> {
    ClaudeSessionService::get_session_detail(&session_path).map_err(|e| e.to_string())
}
