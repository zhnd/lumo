//! Skills service
//!
//! Service for managing Claude Code skills from the filesystem.
//! Supports both global (~/.claude/) and project-level (.claude/) skills.
//! Skills are directories containing SKILL.md files.
//! Legacy commands are individual .md files in commands/ directories.

use anyhow::{Context, Result};
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use crate::types::{CodexSkillSummary, SkillCommandResult, SkillDetail, SkillScope, SkillSummary};

/// YAML frontmatter from SKILL.md
#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
struct SkillFrontmatter {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    version: Option<String>,
    #[serde(default)]
    allowed_tools: Option<String>,
    #[serde(default)]
    model: Option<String>,
    #[serde(default)]
    context: Option<String>,
    #[serde(default)]
    agent: Option<String>,
    #[serde(default)]
    disable_model_invocation: Option<bool>,
    #[serde(default)]
    user_invocable: Option<bool>,
    #[serde(default)]
    argument_hint: Option<String>,
}

/// Top-level structure of .skills-manifest.json
#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct SkillsManifest {
    #[serde(default)]
    skills: HashMap<String, ManifestEntry>,
}

/// Entry from .skills-manifest.json
#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct ManifestEntry {
    #[serde(default)]
    source: Option<String>,
    #[serde(default, alias = "package")]
    package_name: Option<String>,
    #[serde(default)]
    installed_at: Option<String>,
}

pub struct SkillsService;

impl SkillsService {
    fn get_claude_dir() -> Result<PathBuf> {
        let home = dirs::home_dir().context("Failed to get home directory")?;
        Ok(home.join(".claude"))
    }

    /// Get the base .claude directory for a given scope
    fn get_base_dir(project_path: Option<&str>) -> Result<PathBuf> {
        match project_path {
            Some(path) => Ok(PathBuf::from(path).join(".claude")),
            None => Self::get_claude_dir(),
        }
    }

    fn read_manifest(skills_dir: &Path) -> HashMap<String, ManifestEntry> {
        let manifest_path = skills_dir.join(".skills-manifest.json");
        fs::read_to_string(&manifest_path)
            .ok()
            .and_then(|content| serde_json::from_str::<SkillsManifest>(&content).ok())
            .map(|m| m.skills)
            .unwrap_or_default()
    }

    /// Alias for tests that used the old name
    #[cfg(test)]
    fn read_manifest_from(skills_dir: &Path) -> HashMap<String, ManifestEntry> {
        Self::read_manifest(skills_dir)
    }

    fn parse_frontmatter(content: &str) -> (SkillFrontmatter, String) {
        let trimmed = content.trim_start();
        if !trimmed.starts_with("---") {
            return (SkillFrontmatter::default(), content.to_string());
        }

        let after_first = &trimmed[3..];
        if let Some(end_idx) = after_first.find("\n---") {
            let yaml_str = &after_first[..end_idx].trim();
            let body = &after_first[end_idx + 4..];
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

    #[allow(clippy::too_many_arguments)]
    fn build_detail(
        frontmatter: SkillFrontmatter,
        raw_content: String,
        markdown_body: String,
        name: &str,
        scope: SkillScope,
        is_symlink: bool,
        path: &Path,
        manifest_entry: Option<&ManifestEntry>,
    ) -> SkillDetail {
        SkillDetail {
            name: frontmatter.name.unwrap_or_else(|| name.to_string()),
            description: frontmatter.description.unwrap_or_default(),
            version: frontmatter.version.unwrap_or_else(|| "0.0.0".to_string()),
            scope,
            raw_content,
            markdown_body,
            is_symlink,
            is_readonly: is_symlink,
            source: manifest_entry.and_then(|e| e.source.clone()),
            package_name: manifest_entry.and_then(|e| e.package_name.clone()),
            installed_at: manifest_entry.and_then(|e| e.installed_at.clone()),
            path: path.to_string_lossy().to_string(),
            allowed_tools: frontmatter.allowed_tools,
            model: frontmatter.model,
            skill_context: frontmatter.context,
            agent: frontmatter.agent,
            disable_model_invocation: frontmatter.disable_model_invocation.unwrap_or(false),
            user_invocable: frontmatter.user_invocable.unwrap_or(true),
            argument_hint: frontmatter.argument_hint,
        }
    }

    /// Scan a skills/ directory for skill subdirectories
    fn scan_skills_dir(
        skills_dir: &Path,
        scope: SkillScope,
        skills: &mut Vec<SkillSummary>,
    ) {
        if !skills_dir.exists() {
            return;
        }

        let manifest = Self::read_manifest(skills_dir);
        let entries = match fs::read_dir(skills_dir) {
            Ok(e) => e,
            Err(_) => return,
        };

        for entry in entries.flatten() {
            let file_name = entry.file_name().to_string_lossy().to_string();
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
                scope: scope.clone(),
                is_symlink,
                source: manifest_entry.and_then(|e| e.source.clone()),
                package_name: manifest_entry.and_then(|e| e.package_name.clone()),
                installed_at: manifest_entry.and_then(|e| e.installed_at.clone()),
                path: path.to_string_lossy().to_string(),
            });
        }
    }

    /// Recursively scan a commands/ directory for legacy .md files
    fn scan_commands_dir(commands_dir: &Path, skills: &mut Vec<SkillSummary>) {
        if !commands_dir.exists() {
            return;
        }
        Self::scan_commands_dir_recursive(commands_dir, commands_dir, skills);
    }

    fn scan_commands_dir_recursive(
        base_dir: &Path,
        current_dir: &Path,
        skills: &mut Vec<SkillSummary>,
    ) {
        let entries = match fs::read_dir(current_dir) {
            Ok(e) => e,
            Err(_) => return,
        };

        for entry in entries.flatten() {
            let path = entry.path();

            if path.is_dir() {
                Self::scan_commands_dir_recursive(base_dir, &path, skills);
                continue;
            }

            let file_name = entry.file_name().to_string_lossy().to_string();
            if !file_name.ends_with(".md") || file_name.starts_with('.') {
                continue;
            }

            let content = fs::read_to_string(&path).unwrap_or_default();
            let (frontmatter, _body) = Self::parse_frontmatter(&content);

            let rel_path = path
                .strip_prefix(base_dir)
                .unwrap_or(&path)
                .with_extension("");
            let command_name = rel_path.to_string_lossy().to_string();
            let display_name = frontmatter.name.unwrap_or_else(|| command_name.clone());

            skills.push(SkillSummary {
                name: display_name,
                description: frontmatter.description.unwrap_or_default(),
                version: frontmatter.version.unwrap_or_default(),
                scope: SkillScope::Legacy,
                is_symlink: Self::is_symlink(&path),
                source: Some("local".to_string()),
                package_name: None,
                installed_at: None,
                path: path.to_string_lossy().to_string(),
            });
        }
    }

    /// List skills for a given scope.
    /// If project_path is None, lists global (personal) skills.
    /// If project_path is Some, lists skills for that project.
    pub async fn list_skills(project_path: Option<&str>) -> Result<Vec<SkillSummary>> {
        let mut skills = Vec::new();

        let base_dir = Self::get_base_dir(project_path)?;
        let scope = if project_path.is_some() {
            SkillScope::Project
        } else {
            SkillScope::Personal
        };

        Self::scan_skills_dir(&base_dir.join("skills"), scope, &mut skills);
        Self::scan_commands_dir(&base_dir.join("commands"), &mut skills);

        skills.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        Ok(skills)
    }

    /// Count skills in a .claude directory (skill dirs + legacy command files).
    pub fn count_in_dir(base_dir: &Path) -> i32 {
        let mut count: i32 = 0;

        // Count skill directories
        let skills_dir = base_dir.join("skills");
        if skills_dir.exists() {
            if let Ok(entries) = fs::read_dir(&skills_dir) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if !name.starts_with('.') && entry.path().is_dir() {
                        count += 1;
                    }
                }
            }
        }

        // Count legacy command files
        let commands_dir = base_dir.join("commands");
        if commands_dir.exists() {
            count += Self::count_md_files_recursive(&commands_dir);
        }

        count
    }

    fn count_md_files_recursive(dir: &Path) -> i32 {
        let mut count: i32 = 0;
        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return 0,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                count += Self::count_md_files_recursive(&path);
            } else {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.ends_with(".md") && !name.starts_with('.') {
                    count += 1;
                }
            }
        }
        count
    }

    /// Get skill detail by its full filesystem path.
    pub async fn get_skill_detail(path: &str) -> Result<SkillDetail> {
        let skill_path = PathBuf::from(path);

        if !skill_path.exists() {
            anyhow::bail!("Skill path '{}' not found", path);
        }

        // Determine scope from path
        let home = dirs::home_dir().unwrap_or_default();
        let global_claude = home.join(".claude");
        let scope = if skill_path.starts_with(&global_claude) {
            if skill_path
                .to_string_lossy()
                .contains("/commands/")
            {
                SkillScope::Legacy
            } else {
                SkillScope::Personal
            }
        } else if skill_path.to_string_lossy().contains("/.claude/commands/") {
            SkillScope::Legacy
        } else {
            SkillScope::Project
        };

        if skill_path.is_dir() {
            // Skill directory with SKILL.md
            let skill_md_path = skill_path.join("SKILL.md");
            let raw_content = if skill_md_path.exists() {
                fs::read_to_string(&skill_md_path).context("Failed to read SKILL.md")?
            } else {
                String::new()
            };

            let (frontmatter, markdown_body) = Self::parse_frontmatter(&raw_content);
            let is_symlink = Self::is_symlink(&skill_path);

            // Try to read manifest from parent skills/ directory
            let manifest = skill_path
                .parent()
                .map(Self::read_manifest)
                .unwrap_or_default();
            let dir_name = skill_path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();
            let manifest_entry = manifest.get(&dir_name);
            let name = dir_name.clone();

            Ok(Self::build_detail(
                frontmatter,
                raw_content,
                markdown_body,
                &name,
                scope,
                is_symlink,
                &skill_path,
                manifest_entry,
            ))
        } else {
            // Legacy command .md file
            let raw_content =
                fs::read_to_string(&skill_path).context("Failed to read command file")?;
            let (frontmatter, markdown_body) = Self::parse_frontmatter(&raw_content);
            let is_symlink = Self::is_symlink(&skill_path);

            let name = skill_path
                .file_stem()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            Ok(Self::build_detail(
                frontmatter,
                raw_content,
                markdown_body,
                &name,
                scope,
                is_symlink,
                &skill_path,
                None,
            ))
        }
    }

    /// Update a skill by its full filesystem path.
    pub async fn update_skill(path: &str, content: &str) -> Result<SkillCommandResult> {
        let skill_path = PathBuf::from(path);

        if !skill_path.exists() {
            return Ok(SkillCommandResult {
                success: false,
                message: format!("Skill path '{}' not found", path),
            });
        }

        if Self::is_symlink(&skill_path) {
            return Ok(SkillCommandResult {
                success: false,
                message: "Cannot edit a symlinked skill. It is managed externally.".to_string(),
            });
        }

        if skill_path.is_dir() {
            let skill_md_path = skill_path.join("SKILL.md");
            fs::write(&skill_md_path, content).context("Failed to write SKILL.md")?;
        } else {
            fs::write(&skill_path, content).context("Failed to write command file")?;
        }

        Ok(SkillCommandResult {
            success: true,
            message: "Skill updated successfully".to_string(),
        })
    }

    /// Create a new skill.
    /// If project_path is None, creates in ~/.claude/skills/.
    /// If project_path is Some, creates in <project>/.claude/skills/.
    pub async fn create_skill(
        name: &str,
        project_path: Option<&str>,
    ) -> Result<SkillCommandResult> {
        let base_dir = Self::get_base_dir(project_path)?;
        let skills_dir = base_dir.join("skills");

        if !skills_dir.exists() {
            fs::create_dir_all(&skills_dir).context("Failed to create skills directory")?;
        }

        let skill_path = skills_dir.join(name);

        if skill_path.exists() {
            return Ok(SkillCommandResult {
                success: false,
                message: format!("Skill '{}' already exists", name),
            });
        }

        fs::create_dir_all(&skill_path).context("Failed to create skill directory")?;

        let template = format!(
            r#"---
name: {}
description: ""
---

# {}

Add your skill instructions here.
"#,
            name, name
        );

        let skill_md_path = skill_path.join("SKILL.md");
        fs::write(&skill_md_path, template).context("Failed to write SKILL.md")?;

        Ok(SkillCommandResult {
            success: true,
            message: skill_path.to_string_lossy().to_string(),
        })
    }

    fn find_claude_binary() -> Result<PathBuf> {
        which::which("claude").context(
            "Claude CLI not found in PATH. Please install Claude Code first.",
        )
    }

    fn find_npx_binary() -> Result<PathBuf> {
        which::which("npx").context(
            "npx not found in PATH. Please install Node.js first.",
        )
    }

    async fn run_plugin_command(
        args: &[&str],
        cwd: Option<&str>,
    ) -> Result<SkillCommandResult> {
        let claude_bin = Self::find_claude_binary()?;

        let mut cmd = tokio::process::Command::new(&claude_bin);
        cmd.args(args);

        if let Some(dir) = cwd {
            cmd.current_dir(dir);
        }

        let output = cmd
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

    async fn run_skills_cli_command(args: &[&str]) -> Result<SkillCommandResult> {
        let npx_bin = Self::find_npx_binary()?;

        let mut cmd_args = vec!["--yes", "skills"];
        cmd_args.extend_from_slice(args);

        let output = tokio::process::Command::new(&npx_bin)
            .args(&cmd_args)
            .output()
            .await
            .context("Failed to execute npx skills command")?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        if output.status.success() {
            Ok(SkillCommandResult {
                success: true,
                message: if stdout.trim().is_empty() {
                    "Skill installed successfully".to_string()
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

    pub async fn install_skill_from_source(source: &str, is_local: bool) -> Result<SkillCommandResult> {
        if is_local {
            Self::run_skills_cli_command(&["add", source, "--global", "--copy"]).await
        } else {
            Self::run_skills_cli_command(&["add", source, "--global", "--yes"]).await
        }
    }

    pub async fn list_codex_skills() -> Result<Vec<CodexSkillSummary>> {
        let home = dirs::home_dir().context("Failed to get home directory")?;
        let codex_skills_dir = home.join(".agents").join("skills");

        if !codex_skills_dir.exists() {
            return Ok(Vec::new());
        }

        let mut skills = Vec::new();
        let entries = fs::read_dir(&codex_skills_dir).context("Failed to read ~/.agents/skills/")?;

        for entry in entries.flatten() {
            let file_name = entry.file_name().to_string_lossy().to_string();
            if file_name.starts_with('.') {
                continue;
            }

            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let skill_md_path = path.join("SKILL.md");
            let (name, description) = if skill_md_path.exists() {
                let content = fs::read_to_string(&skill_md_path).unwrap_or_default();
                let (fm, _) = Self::parse_frontmatter(&content);
                (
                    fm.name.unwrap_or_else(|| file_name.clone()),
                    fm.description.unwrap_or_default(),
                )
            } else {
                (file_name.clone(), String::new())
            };

            skills.push(CodexSkillSummary {
                name,
                description,
                path: path.to_string_lossy().to_string(),
            });
        }

        skills.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        Ok(skills)
    }

    /// Install a plugin. If project_path is provided, installs in that project scope.
    pub async fn install_skill(
        name: &str,
        project_path: Option<&str>,
    ) -> Result<SkillCommandResult> {
        Self::run_plugin_command(&["plugin", "install", name], project_path).await
    }

    pub async fn uninstall_skill(path: &str) -> Result<SkillCommandResult> {
        let skill_path = std::path::Path::new(path);

        if !skill_path.exists() {
            return Ok(SkillCommandResult {
                success: false,
                message: format!("Skill path '{}' not found", path),
            });
        }

        if skill_path.is_dir() {
            fs::remove_dir_all(skill_path).context("Failed to remove skill directory")?;
        } else {
            fs::remove_file(skill_path).context("Failed to remove command file")?;
        }

        Ok(SkillCommandResult {
            success: true,
            message: "Skill removed successfully".to_string(),
        })
    }

    pub async fn enable_skill(name: &str) -> Result<SkillCommandResult> {
        Self::run_plugin_command(&["plugin", "enable", name], None).await
    }

    pub async fn disable_skill(name: &str) -> Result<SkillCommandResult> {
        Self::run_plugin_command(&["plugin", "disable", name], None).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_manifest_with_nested_skills_structure() {
        let json = r#"{
            "skills": {
                "commit": {
                    "version": "1.0.0",
                    "installedAt": "2026-02-18T10:47:35.989Z",
                    "package": "@user/commit",
                    "path": "/home/user/.claude/skills/commit",
                    "target": "claude-code"
                },
                "react-best-practices": {
                    "version": "1.0.1",
                    "installedAt": "2026-02-18T10:47:41.050Z",
                    "package": "@user/react-best-practices",
                    "path": "/home/user/.claude/skills/react-best-practices",
                    "target": "claude-code",
                    "source": "vercel-labs/agent-skills/skills/react-best-practices"
                }
            },
            "remoteCache": {
                "vercel-labs/agent-skills/skills/react-best-practices": {
                    "lastCheckedAt": "2026-03-03T03:14:59.567Z",
                    "lastSeenSha": "abc123"
                }
            }
        }"#;

        let manifest: SkillsManifest = serde_json::from_str(json).unwrap();
        assert_eq!(manifest.skills.len(), 2);

        let commit = manifest.skills.get("commit").unwrap();
        assert_eq!(
            commit.package_name.as_deref(),
            Some("@user/commit")
        );
        assert_eq!(
            commit.installed_at.as_deref(),
            Some("2026-02-18T10:47:35.989Z")
        );
        assert!(commit.source.is_none());

        let react = manifest.skills.get("react-best-practices").unwrap();
        assert_eq!(
            react.source.as_deref(),
            Some("vercel-labs/agent-skills/skills/react-best-practices")
        );
        assert_eq!(
            react.package_name.as_deref(),
            Some("@user/react-best-practices")
        );
    }

    #[test]
    fn test_parse_manifest_empty_json() {
        let json = "{}";
        let manifest: SkillsManifest = serde_json::from_str(json).unwrap();
        assert!(manifest.skills.is_empty());
    }

    #[test]
    fn test_parse_manifest_missing_optional_fields() {
        let json = r#"{
            "skills": {
                "my-skill": {
                    "version": "1.0.0"
                }
            }
        }"#;

        let manifest: SkillsManifest = serde_json::from_str(json).unwrap();
        let entry = manifest.skills.get("my-skill").unwrap();
        assert!(entry.source.is_none());
        assert!(entry.package_name.is_none());
        assert!(entry.installed_at.is_none());
    }

    #[test]
    fn test_read_manifest_from_with_real_structure() {
        let tmp = tempfile::tempdir().unwrap();
        let manifest_content = r#"{
            "skills": {
                "commit": {
                    "version": "1.0.0",
                    "installedAt": "2026-02-18T10:47:35.989Z",
                    "package": "@user/commit",
                    "path": "/home/user/.claude/skills/commit",
                    "target": "claude-code",
                    "source": "anthropics/commit"
                }
            },
            "remoteCache": {}
        }"#;
        fs::write(
            tmp.path().join(".skills-manifest.json"),
            manifest_content,
        )
        .unwrap();

        let result = SkillsService::read_manifest_from(tmp.path());
        assert_eq!(result.len(), 1);

        let commit = result.get("commit").unwrap();
        assert_eq!(commit.package_name.as_deref(), Some("@user/commit"));
        assert_eq!(commit.source.as_deref(), Some("anthropics/commit"));
        assert_eq!(
            commit.installed_at.as_deref(),
            Some("2026-02-18T10:47:35.989Z")
        );
    }

    #[test]
    fn test_read_manifest_from_missing_file() {
        let tmp = tempfile::tempdir().unwrap();
        let result = SkillsService::read_manifest_from(tmp.path());
        assert!(result.is_empty());
    }

    #[test]
    fn test_read_manifest_from_invalid_json() {
        let tmp = tempfile::tempdir().unwrap();
        fs::write(tmp.path().join(".skills-manifest.json"), "not json").unwrap();
        let result = SkillsService::read_manifest_from(tmp.path());
        assert!(result.is_empty());
    }

    #[test]
    fn test_parse_frontmatter_with_yaml() {
        let content = "---\nname: My Skill\ndescription: A test skill\nversion: 1.2.3\n---\n# Body\nSome content";
        let (fm, body) = SkillsService::parse_frontmatter(content);
        assert_eq!(fm.name.as_deref(), Some("My Skill"));
        assert_eq!(fm.description.as_deref(), Some("A test skill"));
        assert_eq!(fm.version.as_deref(), Some("1.2.3"));
        assert_eq!(body, "# Body\nSome content");
    }

    #[test]
    fn test_parse_frontmatter_no_frontmatter() {
        let content = "# Just Markdown\nNo frontmatter here";
        let (fm, body) = SkillsService::parse_frontmatter(content);
        assert!(fm.name.is_none());
        assert_eq!(body, content);
    }

    #[test]
    fn test_parse_frontmatter_unclosed() {
        let content = "---\nname: Broken\nNo closing delimiter";
        let (fm, body) = SkillsService::parse_frontmatter(content);
        assert!(fm.name.is_none());
        assert_eq!(body, content);
    }

    #[test]
    fn test_parse_frontmatter_empty_content() {
        let (fm, body) = SkillsService::parse_frontmatter("");
        assert!(fm.name.is_none());
        assert_eq!(body, "");
    }

    #[test]
    fn test_manifest_package_field_alias() {
        // The actual manifest uses "package", not "packageName"
        let json = r#"{"package": "@user/my-skill"}"#;
        let entry: ManifestEntry = serde_json::from_str(json).unwrap();
        assert_eq!(entry.package_name.as_deref(), Some("@user/my-skill"));

        // Also works with "packageName" (camelCase)
        let json2 = r#"{"packageName": "@user/my-skill"}"#;
        let entry2: ManifestEntry = serde_json::from_str(json2).unwrap();
        assert_eq!(entry2.package_name.as_deref(), Some("@user/my-skill"));
    }
}
