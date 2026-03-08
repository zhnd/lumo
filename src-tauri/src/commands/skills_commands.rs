//! Skills commands
//!
//! Tauri IPC commands for managing Claude Code skills.

use tauri::command;

use crate::services::SkillsService;
use crate::types::{CodexSkillSummary, SkillCommandResult, SkillDetail, SkillSummary};

/// List skills. If project_path is provided, lists project-scoped skills.
#[command]
pub async fn list_skills(project_path: Option<String>) -> Result<Vec<SkillSummary>, String> {
    SkillsService::list_skills(project_path.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// Get detailed information about a skill by its full filesystem path.
#[command]
pub async fn get_skill_detail(path: String) -> Result<SkillDetail, String> {
    SkillsService::get_skill_detail(&path)
        .await
        .map_err(|e| e.to_string())
}

/// Update a skill's content by its full filesystem path.
#[command]
pub async fn update_skill(path: String, content: String) -> Result<SkillCommandResult, String> {
    SkillsService::update_skill(&path, &content)
        .await
        .map_err(|e| e.to_string())
}

/// Create a new skill. If project_path is provided, creates in project scope.
#[command]
pub async fn create_skill(
    name: String,
    project_path: Option<String>,
) -> Result<SkillCommandResult, String> {
    SkillsService::create_skill(&name, project_path.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// Install a skill from a GitHub source or local path via npx skills CLI
#[command]
pub async fn install_skill_from_source(
    source: String,
    is_local: bool,
) -> Result<SkillCommandResult, String> {
    SkillsService::install_skill_from_source(&source, is_local)
        .await
        .map_err(|e| e.to_string())
}

/// Install a plugin. If project_path is provided, installs in project scope.
#[command]
pub async fn install_skill(
    name: String,
    project_path: Option<String>,
) -> Result<SkillCommandResult, String> {
    SkillsService::install_skill(&name, project_path.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// List available Codex skills from ~/.agents/skills/
#[command]
pub async fn list_codex_skills() -> Result<Vec<CodexSkillSummary>, String> {
    SkillsService::list_codex_skills()
        .await
        .map_err(|e| e.to_string())
}

/// Uninstall a skill by removing its directory/file.
#[command]
pub async fn uninstall_skill(path: String) -> Result<SkillCommandResult, String> {
    SkillsService::uninstall_skill(&path)
        .await
        .map_err(|e| e.to_string())
}

/// Enable a skill via claude plugin CLI
#[command]
pub async fn enable_skill(name: String) -> Result<SkillCommandResult, String> {
    SkillsService::enable_skill(&name)
        .await
        .map_err(|e| e.to_string())
}

/// Disable a skill via claude plugin CLI
#[command]
pub async fn disable_skill(name: String) -> Result<SkillCommandResult, String> {
    SkillsService::disable_skill(&name)
        .await
        .map_err(|e| e.to_string())
}
