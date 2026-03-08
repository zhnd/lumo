//! Skills types
//!
//! Types for the Claude Skills management feature.

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

/// Scope of a skill (where it was discovered)
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SkillScope {
    Personal,
    Project,
    Legacy,
}

/// Summary of a skill for list display
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillSummary {
    pub name: String,
    pub description: String,
    pub version: String,
    pub scope: SkillScope,
    pub is_symlink: bool,
    pub source: Option<String>,
    pub package_name: Option<String>,
    pub installed_at: Option<String>,
    pub path: String,
}

/// Full detail of a skill for viewing/editing
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillDetail {
    pub name: String,
    pub description: String,
    pub version: String,
    pub scope: SkillScope,
    pub raw_content: String,
    pub markdown_body: String,
    pub is_symlink: bool,
    pub is_readonly: bool,
    pub source: Option<String>,
    pub package_name: Option<String>,
    pub installed_at: Option<String>,
    pub path: String,
    // Extended frontmatter fields
    pub allowed_tools: Option<String>,
    pub model: Option<String>,
    pub skill_context: Option<String>,
    pub agent: Option<String>,
    pub disable_model_invocation: bool,
    pub user_invocable: bool,
    pub argument_hint: Option<String>,
}

/// Summary of a Codex skill from ~/.agents/skills/
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexSkillSummary {
    pub name: String,
    pub description: String,
    pub path: String,
}

/// Result of a skill command (install/uninstall/enable/disable)
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillCommandResult {
    pub success: bool,
    pub message: String,
}
