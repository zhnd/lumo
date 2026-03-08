//! Projects service
//!
//! Service for discovering and summarizing Claude Code projects.
//! Projects are derived from the ~/.claude/projects/ directory structure.

use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;

use crate::services::SkillsService;
use crate::types::ClaudeProjectSummary;

pub struct ProjectsService;

impl ProjectsService {
    fn get_claude_dir() -> Result<PathBuf> {
        let home = dirs::home_dir().context("Failed to get home directory")?;
        Ok(home.join(".claude"))
    }

    fn get_projects_dir() -> Result<PathBuf> {
        Ok(Self::get_claude_dir()?.join("projects"))
    }

    /// Decode a folder name back to a project path.
    /// e.g., "-Users-zhnd-dev-projects-lumo" -> "/Users/zhnd/dev/projects/lumo"
    fn folder_name_to_project_path(folder_name: &str) -> String {
        if let Some(stripped) = folder_name.strip_prefix('-') {
            // Unix-style: leading dash → leading slash, remaining dashes → slashes
            format!("/{}", stripped.replace('-', "/"))
        } else {
            // Windows-style or fallback
            folder_name.replace('-', "/")
        }
    }

    fn timestamp_to_rfc3339(ms: i64) -> Option<String> {
        chrono::DateTime::from_timestamp_millis(ms).map(|dt| dt.to_rfc3339())
    }

    fn parse_time_millis(value: &str) -> i64 {
        chrono::DateTime::parse_from_rfc3339(value)
            .map(|dt| dt.timestamp_millis())
            .unwrap_or(0)
    }

    pub fn get_projects_summary() -> Result<Vec<ClaudeProjectSummary>> {
        let projects_dir = Self::get_projects_dir()?;
        if !projects_dir.exists() {
            return Ok(vec![]);
        }

        let mut projects = Vec::new();

        for entry in fs::read_dir(&projects_dir)? {
            let entry = entry?;
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let folder_name = match path.file_name().and_then(|n| n.to_str()) {
                Some(n) => n.to_string(),
                None => continue,
            };

            let project_path = Self::folder_name_to_project_path(&folder_name);
            let mut session_count = 0_i32;
            let mut latest_ms = 0_i64;

            let dir_entries = match fs::read_dir(&path) {
                Ok(entries) => entries,
                Err(_) => continue,
            };

            for file_entry in dir_entries.flatten() {
                let file_path = file_entry.path();
                if !file_path.is_file() {
                    continue;
                }

                if file_path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
                    continue;
                }

                let Some(file_name) = file_path.file_stem().and_then(|name| name.to_str()) else {
                    continue;
                };

                if file_name.starts_with("agent-") {
                    continue;
                }

                session_count += 1;

                let file_mtime = fs::metadata(&file_path)
                    .and_then(|metadata| metadata.modified())
                    .ok()
                    .and_then(|modified| modified.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|duration| duration.as_millis() as i64)
                    .unwrap_or(0);

                if file_mtime > latest_ms {
                    latest_ms = file_mtime;
                }
            }

            if latest_ms == 0 {
                latest_ms = fs::metadata(&path)
                    .and_then(|m| m.modified())
                    .ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);
            }

            let project_name = std::path::Path::new(&project_path)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or(&project_path)
                .to_string();

            let last_updated = Self::timestamp_to_rfc3339(latest_ms)
                .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

            // Count skills for this project
            let claude_dir = PathBuf::from(&project_path).join(".claude");
            let skill_count = if claude_dir.exists() {
                SkillsService::count_in_dir(&claude_dir)
            } else {
                0
            };

            projects.push(ClaudeProjectSummary {
                project_path,
                project_name,
                session_count,
                skill_count,
                last_updated,
            });
        }

        projects.sort_by(|a, b| {
            let a_time = Self::parse_time_millis(&a.last_updated);
            let b_time = Self::parse_time_millis(&b.last_updated);
            b_time.cmp(&a_time)
        });

        Ok(projects)
    }

    /// Count skills in the global ~/.claude directory
    pub fn get_global_skill_count() -> Result<i32> {
        let claude_dir = Self::get_claude_dir()?;
        Ok(SkillsService::count_in_dir(&claude_dir))
    }
}
