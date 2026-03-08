//! Projects commands
//!
//! Tauri IPC commands for Claude Code project discovery.

use crate::services::ProjectsService;
use crate::types::ClaudeProjectSummary;

/// Get all Claude Code projects with session and skill counts
#[tauri::command]
pub fn get_projects() -> Result<Vec<ClaudeProjectSummary>, String> {
    ProjectsService::get_projects_summary().map_err(|e| e.to_string())
}

/// Get global skill count (skills in ~/.claude)
#[tauri::command]
pub fn get_global_skill_count() -> Result<i32, String> {
    ProjectsService::get_global_skill_count().map_err(|e| e.to_string())
}
