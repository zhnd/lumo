//! Skills commands
//!
//! Tauri IPC commands for managing Claude Code skills.

use tauri::command;

use crate::services::SkillsService;
use crate::types::{CodexSkillSummary, SkillCommandResult, SkillDetail, SkillSummary};

/// List all installed skills
#[command]
pub async fn list_skills() -> Result<Vec<SkillSummary>, String> {
    SkillsService::list_skills()
        .await
        .map_err(|e| e.to_string())
}

/// Get detailed information about a specific skill
#[command]
pub async fn get_skill_detail(name: String) -> Result<SkillDetail, String> {
    SkillsService::get_skill_detail(&name)
        .await
        .map_err(|e| e.to_string())
}

/// Update a skill's SKILL.md content
#[command]
pub async fn update_skill(name: String, content: String) -> Result<SkillCommandResult, String> {
    SkillsService::update_skill(&name, &content)
        .await
        .map_err(|e| e.to_string())
}

/// Install a skill via claude plugin CLI
#[command]
pub async fn install_skill(name: String) -> Result<SkillCommandResult, String> {
    SkillsService::install_skill(&name)
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

/// List available Codex skills from ~/.agents/skills/
#[command]
pub async fn list_codex_skills() -> Result<Vec<CodexSkillSummary>, String> {
    SkillsService::list_codex_skills()
        .await
        .map_err(|e| e.to_string())
}

/// Uninstall a skill by removing its directory
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
