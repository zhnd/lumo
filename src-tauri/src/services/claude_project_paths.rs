//! Helpers for Claude Code project path encoding.
//!
//! Claude stores session files under `~/.claude/projects/` using directory names
//! derived from project paths by replacing `/` with `-`. That encoding is lossy
//! when a path segment itself contains `-`, so prefer the exact project paths
//! recorded in `~/.claude.json`.

use anyhow::{Context, Result};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

pub(crate) struct ClaudeProjectPaths;

impl ClaudeProjectPaths {
    fn user_prefs_path() -> Result<PathBuf> {
        let home = dirs::home_dir().context("Failed to get home directory")?;
        Ok(home.join(".claude.json"))
    }

    pub(crate) fn project_path_to_folder_name(project_path: &str) -> String {
        project_path.replace('/', "-")
    }

    fn fallback_folder_name_to_project_path(folder_name: &str) -> String {
        if let Some(stripped) = folder_name.strip_prefix('-') {
            format!("/{}", stripped.replace('-', "/"))
        } else {
            folder_name.replace('-', "/")
        }
    }

    pub(crate) fn load_folder_path_lookup() -> Result<HashMap<String, String>> {
        let path = Self::user_prefs_path()?;
        if !path.exists() {
            return Ok(HashMap::new());
        }

        let content = match fs::read_to_string(&path) {
            Ok(content) => content,
            Err(error) => {
                log::warn!(
                    "Failed to read Claude preferences at {}: {}",
                    path.display(),
                    error
                );
                return Ok(HashMap::new());
            }
        };
        let prefs: serde_json::Value = match serde_json::from_str(&content) {
            Ok(prefs) => prefs,
            Err(error) => {
                log::warn!(
                    "Failed to parse Claude preferences JSON at {}: {}",
                    path.display(),
                    error
                );
                return Ok(HashMap::new());
            }
        };

        let Some(projects) = prefs.get("projects").and_then(|value| value.as_object()) else {
            return Ok(HashMap::new());
        };

        let mut lookup = HashMap::with_capacity(projects.len());
        for project_path in projects.keys() {
            lookup.insert(
                Self::project_path_to_folder_name(project_path),
                project_path.clone(),
            );
        }

        Ok(lookup)
    }

    pub(crate) fn folder_name_to_project_path(
        folder_name: &str,
        lookup: &HashMap<String, String>,
    ) -> String {
        lookup
            .get(folder_name)
            .cloned()
            .unwrap_or_else(|| Self::fallback_folder_name_to_project_path(folder_name))
    }
}

#[cfg(test)]
mod tests {
    use super::ClaudeProjectPaths;
    use std::collections::HashMap;

    #[test]
    fn resolves_hyphenated_project_paths_from_lookup() {
        let project_path = "/Users/void/dev/projects/my-app";
        let folder_name = ClaudeProjectPaths::project_path_to_folder_name(project_path);
        let lookup = HashMap::from([(folder_name.clone(), project_path.to_string())]);

        assert_eq!(
            ClaudeProjectPaths::folder_name_to_project_path(&folder_name, &lookup),
            project_path
        );
    }

    #[test]
    fn falls_back_to_legacy_directory_decoding() {
        let lookup = HashMap::new();

        assert_eq!(
            ClaudeProjectPaths::folder_name_to_project_path(
                "-Users-void-dev-projects-lumo",
                &lookup
            ),
            "/Users/void/dev/projects/lumo"
        );
    }
}
