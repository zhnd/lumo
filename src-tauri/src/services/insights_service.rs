//! Insights service
//!
//! Manages Claude Code `/insights` report generation and retrieval.

use anyhow::{Context, Result};
use std::path::PathBuf;

use crate::types::InsightsReport;

pub struct InsightsService;

impl InsightsService {
    /// Scan known directories for insights HTML report files.
    pub async fn list_reports() -> Result<Vec<InsightsReport>> {
        let home = dirs::home_dir().context("Could not determine home directory")?;
        let mut reports = Vec::new();

        // Scan known locations
        let search_dirs = [
            home.join(".claude/usage-data"),
            home.join(".claude/insights"),
        ];

        for dir in &search_dirs {
            if !dir.is_dir() {
                continue;
            }

            let entries = std::fs::read_dir(dir).context("Failed to read directory")?;
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().is_some_and(|ext| ext == "html") {
                    if let Ok(meta) = path.metadata() {
                        let created_at = meta
                            .modified()
                            .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis() as f64;

                        reports.push(InsightsReport {
                            path: path.to_string_lossy().to_string(),
                            file_name: path
                                .file_name()
                                .unwrap_or_default()
                                .to_string_lossy()
                                .to_string(),
                            created_at,
                        });
                    }
                }
            }
        }

        // Sort by creation time descending (newest first)
        reports.sort_by(|a, b| b.created_at.partial_cmp(&a.created_at).unwrap_or(std::cmp::Ordering::Equal));

        Ok(reports)
    }

    /// Generate a new insights report by calling `claude /insights`.
    /// Returns the path of the generated report file.
    pub async fn generate_report() -> Result<String> {
        let claude_bin = Self::find_claude_binary()?;

        let output = tokio::process::Command::new(&claude_bin)
            .arg("/insights")
            .output()
            .await
            .context("Failed to execute claude /insights")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            anyhow::bail!("claude /insights failed: {}", stderr);
        }

        // After generation, find the newest report
        let reports = Self::list_reports().await?;
        reports
            .first()
            .map(|r| r.path.clone())
            .context("No report file found after generation")
    }

    /// Read the HTML content of a report file.
    pub async fn read_report(path: String) -> Result<String> {
        let file_path = PathBuf::from(&path);

        // Security: ensure the path is under ~/.claude/
        let home = dirs::home_dir().context("Could not determine home directory")?;
        let claude_dir = home.join(".claude");
        if !file_path.starts_with(&claude_dir) {
            anyhow::bail!("Access denied: path is not under ~/.claude/");
        }

        tokio::fs::read_to_string(&file_path)
            .await
            .context("Failed to read report file")
    }

    fn find_claude_binary() -> Result<PathBuf> {
        which::which("claude").context(
            "Claude CLI not found in PATH. Please install Claude Code first.",
        )
    }
}
