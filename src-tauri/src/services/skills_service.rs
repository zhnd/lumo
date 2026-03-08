//! Skills service
//!
//! Service for managing Claude Code skills from the filesystem.
//! Skills are stored in ~/.claude/skills/ as directories containing SKILL.md files.

use anyhow::{Context, Result};
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use crate::types::{SkillCommandResult, SkillDetail, SkillSummary};

/// YAML frontmatter from SKILL.md
#[derive(Debug, Deserialize, Default)]
struct SkillFrontmatter {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    version: Option<String>,
}

/// Entry from .skills-manifest.json
#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct ManifestEntry {
    #[serde(default)]
    source: Option<String>,
    #[serde(default)]
    package_name: Option<String>,
    #[serde(default)]
    installed_at: Option<String>,
}

pub struct SkillsService;

impl SkillsService {
    fn get_skills_dir() -> Result<PathBuf> {
        let home = dirs::home_dir().context("Failed to get home directory")?;
        Ok(home.join(".claude").join("skills"))
    }

    fn read_manifest() -> HashMap<String, ManifestEntry> {
        let Ok(skills_dir) = Self::get_skills_dir() else {
            return HashMap::new();
        };
        let manifest_path = skills_dir.join(".skills-manifest.json");
        fs::read_to_string(&manifest_path)
            .ok()
            .and_then(|content| serde_json::from_str(&content).ok())
            .unwrap_or_default()
    }

    fn parse_frontmatter(content: &str) -> (SkillFrontmatter, String) {
        let trimmed = content.trim_start();
        if !trimmed.starts_with("---") {
            return (SkillFrontmatter::default(), content.to_string());
        }

        // Find the closing ---
        let after_first = &trimmed[3..];
        if let Some(end_idx) = after_first.find("\n---") {
            let yaml_str = &after_first[..end_idx].trim();
            let body = &after_first[end_idx + 4..]; // skip \n---
            let frontmatter: SkillFrontmatter =
                serde_yaml::from_str(yaml_str).unwrap_or_default();
            (frontmatter, body.trim_start_matches('\n').to_string())
        } else {
            (SkillFrontmatter::default(), content.to_string())
        }
    }

    fn is_symlink(path: &Path) -> bool {
        fs::symlink_metadata(path)
            .map(|m| m.file_type().is_symlink())
            .unwrap_or(false)
    }

    pub async fn list_skills() -> Result<Vec<SkillSummary>> {
        let skills_dir = Self::get_skills_dir()?;
        if !skills_dir.exists() {
            return Ok(Vec::new());
        }

        let manifest = Self::read_manifest();
        let mut skills = Vec::new();

        let entries = fs::read_dir(&skills_dir).context("Failed to read skills directory")?;

        for entry in entries.flatten() {
            let file_name = entry.file_name().to_string_lossy().to_string();

            // Skip hidden files and manifest
            if file_name.starts_with('.') {
                continue;
            }

            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let skill_md_path = path.join("SKILL.md");
            let is_symlink = Self::is_symlink(&path);

            let (frontmatter, _body) = if skill_md_path.exists() {
                let content = fs::read_to_string(&skill_md_path).unwrap_or_default();
                Self::parse_frontmatter(&content)
            } else {
                (SkillFrontmatter::default(), String::new())
            };

            let manifest_entry = manifest.get(&file_name);

            skills.push(SkillSummary {
                name: frontmatter.name.unwrap_or_else(|| file_name.clone()),
                description: frontmatter.description.unwrap_or_default(),
                version: frontmatter.version.unwrap_or_else(|| "0.0.0".to_string()),
                is_symlink,
                source: manifest_entry.and_then(|e| e.source.clone()),
                package_name: manifest_entry.and_then(|e| e.package_name.clone()),
                installed_at: manifest_entry.and_then(|e| e.installed_at.clone()),
                path: path.to_string_lossy().to_string(),
            });
        }

        skills.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        Ok(skills)
    }

    pub async fn get_skill_detail(name: &str) -> Result<SkillDetail> {
        let skills_dir = Self::get_skills_dir()?;
        let skill_path = skills_dir.join(name);

        if !skill_path.exists() || !skill_path.is_dir() {
            anyhow::bail!("Skill '{}' not found", name);
        }

        let skill_md_path = skill_path.join("SKILL.md");
        let raw_content = if skill_md_path.exists() {
            fs::read_to_string(&skill_md_path).context("Failed to read SKILL.md")?
        } else {
            String::new()
        };

        let (frontmatter, markdown_body) = Self::parse_frontmatter(&raw_content);
        let is_symlink = Self::is_symlink(&skill_path);
        let manifest = Self::read_manifest();
        let manifest_entry = manifest.get(name);

        Ok(SkillDetail {
            name: frontmatter.name.unwrap_or_else(|| name.to_string()),
            description: frontmatter.description.unwrap_or_default(),
            version: frontmatter.version.unwrap_or_else(|| "0.0.0".to_string()),
            raw_content,
            markdown_body,
            is_symlink,
            is_readonly: is_symlink,
            source: manifest_entry.and_then(|e| e.source.clone()),
            package_name: manifest_entry.and_then(|e| e.package_name.clone()),
            installed_at: manifest_entry.and_then(|e| e.installed_at.clone()),
            path: skill_path.to_string_lossy().to_string(),
        })
    }

    pub async fn update_skill(name: &str, content: &str) -> Result<SkillCommandResult> {
        let skills_dir = Self::get_skills_dir()?;
        let skill_path = skills_dir.join(name);

        if !skill_path.exists() || !skill_path.is_dir() {
            return Ok(SkillCommandResult {
                success: false,
                message: format!("Skill '{}' not found", name),
            });
        }

        if Self::is_symlink(&skill_path) {
            return Ok(SkillCommandResult {
                success: false,
                message: "Cannot edit a symlinked skill. It is managed externally.".to_string(),
            });
        }

        let skill_md_path = skill_path.join("SKILL.md");
        fs::write(&skill_md_path, content).context("Failed to write SKILL.md")?;

        Ok(SkillCommandResult {
            success: true,
            message: "Skill updated successfully".to_string(),
        })
    }

    fn find_claude_binary() -> Result<PathBuf> {
        which::which("claude").context(
            "Claude CLI not found in PATH. Please install Claude Code first.",
        )
    }

    async fn run_plugin_command(args: &[&str]) -> Result<SkillCommandResult> {
        let claude_bin = Self::find_claude_binary()?;

        let output = tokio::process::Command::new(&claude_bin)
            .args(args)
            .output()
            .await
            .context("Failed to execute claude command")?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        if output.status.success() {
            Ok(SkillCommandResult {
                success: true,
                message: if stdout.trim().is_empty() {
                    "Command completed successfully".to_string()
                } else {
                    stdout.trim().to_string()
                },
            })
        } else {
            Ok(SkillCommandResult {
                success: false,
                message: if stderr.trim().is_empty() {
                    stdout.trim().to_string()
                } else {
                    stderr.trim().to_string()
                },
            })
        }
    }

    pub async fn install_skill(name: &str) -> Result<SkillCommandResult> {
        Self::run_plugin_command(&["plugin", "install", name]).await
    }

    pub async fn uninstall_skill(path: &str) -> Result<SkillCommandResult> {
        let skill_path = std::path::Path::new(path);

        if !skill_path.exists() || !skill_path.is_dir() {
            return Ok(SkillCommandResult {
                success: false,
                message: format!("Skill path '{}' not found", path),
            });
        }

        fs::remove_dir_all(skill_path).context("Failed to remove skill directory")?;

        Ok(SkillCommandResult {
            success: true,
            message: "Skill removed successfully".to_string(),
        })
    }

    pub async fn enable_skill(name: &str) -> Result<SkillCommandResult> {
        Self::run_plugin_command(&["plugin", "enable", name]).await
    }

    pub async fn disable_skill(name: &str) -> Result<SkillCommandResult> {
        Self::run_plugin_command(&["plugin", "disable", name]).await
    }
}
