//! Claude session service
//!
//! Service for reading and parsing Claude Code session data from ~/.claude folder.

use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;

use crate::types::{
    ClaudeContentBlock, ClaudeMessage, ClaudeProjectSummary, ClaudeSession, ClaudeSessionDetail,
    ClaudeSessionIndex, ClaudeSessionStats, ClaudeToolUse, RawClaudeMessage,
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

    fn timestamp_to_rfc3339(ms: i64) -> Option<String> {
        chrono::DateTime::from_timestamp_millis(ms).map(|dt| dt.to_rfc3339())
    }

    fn parse_time_millis(value: &str) -> i64 {
        chrono::DateTime::parse_from_rfc3339(value)
            .map(|dt| dt.timestamp_millis())
            .unwrap_or(0)
    }

    /// Get all Claude projects with aggregate session stats
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

            let index_path = path.join("sessions-index.json");
            if !index_path.exists() {
                continue;
            }

            let Ok(content) = fs::read_to_string(&index_path) else {
                continue;
            };
            let Ok(index) = serde_json::from_str::<ClaudeSessionIndex>(&content) else {
                continue;
            };

            let mut session_count = 0_i32;
            let mut latest_ms = 0_i64;
            let mut project_path: Option<String> = None;

            for item in index.entries {
                if item.is_sidechain {
                    continue;
                }
                session_count += 1;
                if project_path.is_none() {
                    project_path = Some(item.project_path.clone());
                }

                let updated = if let Some(ms) = item.file_mtime {
                    ms
                } else {
                    Self::parse_time_millis(&item.modified)
                };
                if updated > latest_ms {
                    latest_ms = updated;
                }
            }

            if session_count == 0 {
                continue;
            }

            let project_path = project_path.unwrap_or_else(|| path.to_string_lossy().to_string());
            let project_name = std::path::Path::new(&project_path)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or(&project_path)
                .to_string();
            let last_updated = Self::timestamp_to_rfc3339(latest_ms)
                .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

            projects.push(ClaudeProjectSummary {
                project_path,
                project_name,
                session_count,
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

        for (line_index, line) in content.lines().enumerate() {
            if line.trim().is_empty() {
                continue;
            }

            if let Ok(raw) = serde_json::from_str::<RawClaudeMessage>(line) {
                // Skip non-message events with no useful content
                if raw.message_type != "user"
                    && raw.message_type != "assistant"
                    && raw.message_type != "system"
                {
                    continue;
                }

                let uuid = raw
                    .uuid
                    .unwrap_or_else(|| format!("line-{}-{}", line_index, raw.message_type));
                let timestamp = raw.timestamp.unwrap_or_default();

                // Parse content
                let (text, tool_uses, blocks) = if let Some(msg_data) = &raw.message {
                    if let Some(content_value) = &msg_data.content {
                        Self::parse_content(content_value, raw.tool_use_result.as_ref())
                    } else {
                        (None, vec![], vec![])
                    }
                } else if let Some(txt) = &raw.content {
                    let block = ClaudeContentBlock {
                        block_type: "text".to_string(),
                        text: Some(txt.clone()),
                        tool_use_id: None,
                        name: None,
                        input: None,
                        output: None,
                        raw_json: None,
                        file_path: None,
                        file_content: None,
                        is_error: None,
                    };
                    (Some(txt.clone()), vec![], vec![block])
                } else {
                    (None, vec![], vec![])
                };

                // Get model from message data
                let model = raw.message.as_ref().and_then(|m| m.model.clone());

                let has_text = text.as_ref().map(|t| !t.trim().is_empty()).unwrap_or(false);
                let has_blocks = blocks.iter().any(Self::block_has_visible_content);
                let has_tool_uses = !tool_uses.is_empty();

                // Skip messages without any renderable content
                if !has_text && !has_tool_uses && !has_blocks {
                    continue;
                }

                messages.push(ClaudeMessage {
                    uuid,
                    message_type: raw.message_type,
                    timestamp,
                    text,
                    tool_uses,
                    blocks,
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
    fn parse_content(
        value: &serde_json::Value,
        tool_use_result: Option<&serde_json::Value>,
    ) -> (Option<String>, Vec<ClaudeToolUse>, Vec<ClaudeContentBlock>) {
        match value {
            serde_json::Value::String(s) => {
                let block = ClaudeContentBlock {
                    block_type: "text".to_string(),
                    text: Some(s.clone()),
                    tool_use_id: None,
                    name: None,
                    input: None,
                    output: None,
                    raw_json: None,
                    file_path: None,
                    file_content: None,
                    is_error: None,
                };
                (Some(s.clone()), vec![], vec![block])
            }
            serde_json::Value::Array(arr) => {
                let mut text_parts = Vec::new();
                let mut tool_uses = Vec::new();
                let mut blocks = Vec::new();

                for item in arr {
                    if let Some(obj) = item.as_object() {
                        let block_type = obj.get("type").and_then(|v| v.as_str());

                        match block_type {
                            Some("text") => {
                                if let Some(text) = obj.get("text").and_then(|v| v.as_str()) {
                                    text_parts.push(text.to_string());
                                    blocks.push(ClaudeContentBlock {
                                        block_type: "text".to_string(),
                                        text: Some(text.to_string()),
                                        tool_use_id: None,
                                        name: None,
                                        input: None,
                                        output: None,
                                        raw_json: None,
                                        file_path: None,
                                        file_content: None,
                                        is_error: None,
                                    });
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
                                        input: input.clone(),
                                    });

                                    blocks.push(ClaudeContentBlock {
                                        block_type: "tool_use".to_string(),
                                        text: None,
                                        tool_use_id: Some(id.to_string()),
                                        name: Some(name.to_string()),
                                        input,
                                        output: None,
                                        raw_json: None,
                                        file_path: None,
                                        file_content: None,
                                        is_error: None,
                                    });
                                }
                            }
                            Some("tool_result") => {
                                let tool_use_id = obj
                                    .get("tool_use_id")
                                    .and_then(|v| v.as_str())
                                    .map(String::from);
                                let output = obj.get("content").or_else(|| obj.get("output")).map(|v| {
                                    if let Some(s) = v.as_str() {
                                        s.to_string()
                                    } else {
                                        serde_json::to_string(v).unwrap_or_default()
                                    }
                                });
                                let is_error = obj.get("is_error").and_then(|v| v.as_bool());
                                let raw_json =
                                    tool_use_result.and_then(|v| serde_json::to_string(v).ok());
                                let file_path = tool_use_result
                                    .and_then(|v| {
                                        v.get("file")
                                            .and_then(|f| f.get("filePath"))
                                            .or_else(|| v.get("filePath"))
                                    })
                                    .and_then(|v| v.as_str())
                                    .map(String::from);
                                let file_content = tool_use_result
                                    .and_then(|v| {
                                        v.get("file")
                                            .and_then(|f| f.get("content"))
                                            .or_else(|| v.get("content"))
                                            .or_else(|| v.get("newString"))
                                    })
                                    .and_then(|v| v.as_str())
                                    .map(String::from);
                                let fallback_output = tool_use_result
                                    .and_then(|v| v.get("content"))
                                    .and_then(|v| v.as_str())
                                    .map(String::from);

                                blocks.push(ClaudeContentBlock {
                                    block_type: "tool_result".to_string(),
                                    text: None,
                                    tool_use_id,
                                    name: None,
                                    input: None,
                                    output: output.or(fallback_output),
                                    raw_json,
                                    file_path,
                                    file_content,
                                    is_error,
                                });
                            }
                            Some("thinking") | Some("redacted_thinking") => {
                                let text = obj
                                    .get("thinking")
                                    .or_else(|| obj.get("text"))
                                    .and_then(|v| v.as_str())
                                    .map(String::from);
                                blocks.push(ClaudeContentBlock {
                                    block_type: block_type.unwrap_or("thinking").to_string(),
                                    text,
                                    tool_use_id: None,
                                    name: None,
                                    input: None,
                                    output: None,
                                    raw_json: None,
                                    file_path: None,
                                    file_content: None,
                                    is_error: None,
                                });
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

                (text, tool_uses, blocks)
            }
            _ => (None, vec![], vec![]),
        }
    }
    fn block_has_visible_content(block: &ClaudeContentBlock) -> bool {
        match block.block_type.as_str() {
            "text" | "thinking" | "redacted_thinking" => block
                .text
                .as_ref()
                .map(|t| !t.trim().is_empty())
                .unwrap_or(false),
            "tool_use" => block
                .name
                .as_ref()
                .map(|n| !n.trim().is_empty())
                .unwrap_or(false),
            "tool_result" => block
                .output
                .as_ref()
                .map(|o| !o.trim().is_empty())
                .unwrap_or(false)
                || block
                    .file_content
                    .as_ref()
                    .map(|c| !c.trim().is_empty())
                    .unwrap_or(false)
                || block
                    .raw_json
                    .as_ref()
                    .map(|j| !j.trim().is_empty())
                    .unwrap_or(false),
            _ => false,
        }
    }
}
