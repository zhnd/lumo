//! Claude session service
//!
//! Service for reading and parsing Claude Code session data from ~/.claude folder.

use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;

use crate::types::{
    ClaudeMessage, ClaudeSession, ClaudeSessionDetail, ClaudeSessionIndex, ClaudeSessionStats,
    ClaudeToolUse, RawClaudeMessage,
};

/// Service for Claude Code session operations
pub struct ClaudeSessionService;

impl ClaudeSessionService {
    /// Get the path to the .claude directory
    fn get_claude_dir() -> Result<PathBuf> {
        let home = dirs::home_dir().context("Failed to get home directory")?;
        Ok(home.join(".claude"))
    }

    /// Get the path to the projects directory
    fn get_projects_dir() -> Result<PathBuf> {
        Ok(Self::get_claude_dir()?.join("projects"))
    }

    /// Convert a project path to its .claude folder name format
    /// e.g., "/Users/zhnd/dev/projects/lumo" -> "-Users-zhnd-dev-projects-lumo"
    fn project_path_to_folder_name(project_path: &str) -> String {
        project_path.replace('/', "-")
    }

    /// Get all sessions for a specific project
    pub fn get_sessions_for_project(project_path: &str) -> Result<Vec<ClaudeSession>> {
        let projects_dir = Self::get_projects_dir()?;
        let folder_name = Self::project_path_to_folder_name(project_path);
        let project_dir = projects_dir.join(&folder_name);

        if !project_dir.exists() {
            return Ok(vec![]);
        }

        let index_path = project_dir.join("sessions-index.json");
        if !index_path.exists() {
            return Ok(vec![]);
        }

        let content = fs::read_to_string(&index_path)
            .with_context(|| format!("Failed to read sessions index: {:?}", index_path))?;

        let index: ClaudeSessionIndex =
            serde_json::from_str(&content).with_context(|| "Failed to parse sessions index")?;

        let mut sessions: Vec<ClaudeSession> = index
            .entries
            .into_iter()
            .filter(|e| !e.is_sidechain) // Filter out sidechain sessions
            .map(ClaudeSession::from)
            .collect();

        // Sort by modified date (newest first)
        sessions.sort_by(|a, b| {
            let a_time = a.last_updated.as_deref().unwrap_or(&a.modified);
            let b_time = b.last_updated.as_deref().unwrap_or(&b.modified);
            b_time.cmp(a_time)
        });

        Ok(sessions)
    }

    /// Get all sessions across all projects
    pub fn get_all_sessions() -> Result<Vec<ClaudeSession>> {
        let projects_dir = Self::get_projects_dir()?;

        if !projects_dir.exists() {
            return Ok(vec![]);
        }

        let mut all_sessions = Vec::new();

        for entry in fs::read_dir(&projects_dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                let index_path = path.join("sessions-index.json");
                if index_path.exists() {
                    if let Ok(content) = fs::read_to_string(&index_path) {
                        if let Ok(index) = serde_json::from_str::<ClaudeSessionIndex>(&content) {
                            let sessions: Vec<ClaudeSession> = index
                                .entries
                                .into_iter()
                                .filter(|e| !e.is_sidechain)
                                .map(ClaudeSession::from)
                                .collect();
                            all_sessions.extend(sessions);
                        }
                    }
                }
            }
        }

        // Sort by modified date (newest first)
        all_sessions.sort_by(|a, b| {
            let a_time = a.last_updated.as_deref().unwrap_or(&a.modified);
            let b_time = b.last_updated.as_deref().unwrap_or(&b.modified);
            b_time.cmp(a_time)
        });

        Ok(all_sessions)
    }

    /// Get session detail including messages
    pub fn get_session_detail(session_path: &str) -> Result<ClaudeSessionDetail> {
        let path = PathBuf::from(session_path);

        if !path.exists() {
            anyhow::bail!("Session file not found: {}", session_path);
        }

        // First, find the session in the index
        let parent = path.parent().context("Invalid session path")?;
        let index_path = parent.join("sessions-index.json");

        let session = if index_path.exists() {
            let content = fs::read_to_string(&index_path)?;
            let index: ClaudeSessionIndex = serde_json::from_str(&content)?;

            index
                .entries
                .into_iter()
                .find(|e| e.full_path == session_path)
                .map(ClaudeSession::from)
        } else {
            None
        };

        let session = session.unwrap_or_else(|| {
            // Create a minimal session from file metadata
            let file_name = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();

            ClaudeSession {
                session_id: file_name,
                full_path: session_path.to_string(),
                first_prompt: None,
                summary: None,
                message_count: 0,
                created: String::new(),
                modified: String::new(),
                last_updated: None,
                git_branch: None,
                project_path: parent.to_string_lossy().to_string(),
                is_sidechain: false,
            }
        });

        // Read and parse messages
        let content = fs::read_to_string(&path)?;
        let (messages, stats) = Self::parse_session_messages_with_stats(&content)?;

        Ok(ClaudeSessionDetail {
            session,
            messages,
            stats,
        })
    }

    /// Parse messages from a session JSONL file
    fn parse_session_messages(content: &str) -> Result<Vec<ClaudeMessage>> {
        let mut messages = Vec::new();

        for line in content.lines() {
            if line.trim().is_empty() {
                continue;
            }

            if let Ok(raw) = serde_json::from_str::<RawClaudeMessage>(line) {
                // Only process user and assistant messages
                if raw.message_type != "user" && raw.message_type != "assistant" {
                    continue;
                }

                let uuid = raw.uuid.unwrap_or_default();
                let timestamp = raw.timestamp.unwrap_or_default();

                // Parse content
                let (text, tool_uses) = if let Some(msg_data) = &raw.message {
                    if let Some(content_value) = &msg_data.content {
                        Self::parse_content(content_value)
                    } else {
                        (None, vec![])
                    }
                } else if let Some(txt) = &raw.content {
                    (Some(txt.clone()), vec![])
                } else {
                    (None, vec![])
                };

                // Get model from message data
                let model = raw.message.as_ref().and_then(|m| m.model.clone());

                // Skip messages without content
                if text.is_none() && tool_uses.is_empty() {
                    continue;
                }

                messages.push(ClaudeMessage {
                    uuid,
                    message_type: raw.message_type,
                    timestamp,
                    text,
                    tool_uses,
                    model,
                });
            }
        }

        // Remove duplicate messages (same uuid, keep the last one with most content)
        let mut seen_uuids = std::collections::HashMap::new();
        for (i, msg) in messages.iter().enumerate() {
            seen_uuids.insert(msg.uuid.clone(), i);
        }

        let unique_indices: std::collections::HashSet<usize> =
            seen_uuids.values().cloned().collect();
        messages = messages
            .into_iter()
            .enumerate()
            .filter(|(i, _)| unique_indices.contains(i))
            .map(|(_, m)| m)
            .collect();

        Ok(messages)
    }

    /// Parse messages and compute stats from a session JSONL file
    fn parse_session_messages_with_stats(
        content: &str,
    ) -> Result<(Vec<ClaudeMessage>, ClaudeSessionStats)> {
        let mut total_input_tokens: i64 = 0;
        let mut total_output_tokens: i64 = 0;
        let mut total_cache_read_tokens: i64 = 0;
        let mut total_cache_creation_tokens: i64 = 0;
        let mut model_for_cost: Option<String> = None;

        // First pass: collect raw messages for stats
        let lines: Vec<&str> = content.lines().filter(|l| !l.trim().is_empty()).collect();
        let mut raw_messages: Vec<RawClaudeMessage> = Vec::new();

        for line in &lines {
            if let Ok(raw) = serde_json::from_str::<RawClaudeMessage>(line) {
                raw_messages.push(raw);
            }
        }

        // Accumulate usage from all raw messages
        for raw in &raw_messages {
            if let Some(msg_data) = &raw.message {
                if let Some(usage) = &msg_data.usage {
                    total_input_tokens += usage.input_tokens.unwrap_or(0);
                    total_output_tokens += usage.output_tokens.unwrap_or(0);
                    total_cache_read_tokens += usage.cache_read_input_tokens.unwrap_or(0);
                    total_cache_creation_tokens += usage.cache_creation_input_tokens.unwrap_or(0);
                }
                if model_for_cost.is_none() {
                    if let Some(m) = &msg_data.model {
                        model_for_cost = Some(m.clone());
                    }
                }
            }
        }

        // Compute duration from first/last timestamp
        let timestamps: Vec<&str> = raw_messages
            .iter()
            .filter_map(|r| r.timestamp.as_deref())
            .collect();

        let duration_seconds = if timestamps.len() >= 2 {
            let first = chrono::DateTime::parse_from_rfc3339(timestamps[0]);
            let last = chrono::DateTime::parse_from_rfc3339(timestamps[timestamps.len() - 1]);
            match (first, last) {
                (Ok(f), Ok(l)) => (l - f).num_seconds().max(0),
                _ => 0,
            }
        } else {
            0
        };

        // Estimate cost based on model
        let estimated_cost_usd = Self::estimate_cost(
            &model_for_cost.unwrap_or_default(),
            total_input_tokens,
            total_output_tokens,
            total_cache_read_tokens,
            total_cache_creation_tokens,
        );

        let messages = Self::parse_session_messages(content)?;

        let stats = ClaudeSessionStats {
            total_input_tokens: total_input_tokens as i32,
            total_output_tokens: total_output_tokens as i32,
            total_cache_read_tokens: total_cache_read_tokens as i32,
            total_cache_creation_tokens: total_cache_creation_tokens as i32,
            estimated_cost_usd,
            duration_seconds: duration_seconds as i32,
        };

        Ok((messages, stats))
    }

    /// Estimate cost in USD based on model and token counts
    fn estimate_cost(
        model: &str,
        input: i64,
        output: i64,
        cache_read: i64,
        cache_creation: i64,
    ) -> f64 {
        // Per million token pricing
        let (input_rate, output_rate, cache_read_rate, cache_creation_rate) =
            if model.contains("opus") {
                (15.0, 75.0, 1.875, 18.75)
            } else if model.contains("haiku") {
                (0.80, 4.0, 0.08, 1.0)
            } else {
                // Default to Sonnet pricing
                (3.0, 15.0, 0.30, 3.75)
            };

        let per_m = 1_000_000.0;
        (input as f64 * input_rate
            + output as f64 * output_rate
            + cache_read as f64 * cache_read_rate
            + cache_creation as f64 * cache_creation_rate)
            / per_m
    }

    /// Parse content value into text and tool uses
    fn parse_content(value: &serde_json::Value) -> (Option<String>, Vec<ClaudeToolUse>) {
        match value {
            serde_json::Value::String(s) => (Some(s.clone()), vec![]),
            serde_json::Value::Array(arr) => {
                let mut text_parts = Vec::new();
                let mut tool_uses = Vec::new();

                for item in arr {
                    if let Some(obj) = item.as_object() {
                        let block_type = obj.get("type").and_then(|v| v.as_str());

                        match block_type {
                            Some("text") => {
                                if let Some(text) = obj.get("text").and_then(|v| v.as_str()) {
                                    text_parts.push(text.to_string());
                                }
                            }
                            Some("tool_use") => {
                                if let (Some(id), Some(name)) = (
                                    obj.get("id").and_then(|v| v.as_str()),
                                    obj.get("name").and_then(|v| v.as_str()),
                                ) {
                                    let input = obj
                                        .get("input")
                                        .map(|v| serde_json::to_string(v).unwrap_or_default());

                                    tool_uses.push(ClaudeToolUse {
                                        id: id.to_string(),
                                        name: name.to_string(),
                                        input,
                                    });
                                }
                            }
                            _ => {}
                        }
                    }
                }

                let text = if text_parts.is_empty() {
                    None
                } else {
                    Some(text_parts.join("\n"))
                };

                (text, tool_uses)
            }
            _ => (None, vec![]),
        }
    }
}
