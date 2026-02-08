//! Claude Code session types
//!
//! Types for reading and parsing Claude Code session data from ~/.claude folder.

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

/// Claude Code session index entry (from sessions-index.json)
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeSession {
    pub session_id: String,
    pub full_path: String,
    #[serde(default)]
    pub first_prompt: Option<String>,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub message_count: i32,
    pub created: String,
    pub modified: String,
    /// Actual file modification time (more accurate than modified field)
    #[serde(default)]
    pub last_updated: Option<String>,
    #[serde(default)]
    pub git_branch: Option<String>,
    pub project_path: String,
    #[serde(default)]
    pub is_sidechain: bool,
}

/// Claude project summary (aggregated from sessions-index.json)
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeProjectSummary {
    pub project_path: String,
    pub project_name: String,
    pub session_count: i32,
    pub last_updated: String,
}

/// Claude Code session index file structure (internal, not exported)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeSessionIndex {
    #[allow(dead_code)]
    pub version: i32,
    pub entries: Vec<ClaudeSessionIndexEntry>,
    #[allow(dead_code)]
    pub original_path: String,
}

/// Entry in the session index (internal, not exported)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeSessionIndexEntry {
    pub session_id: String,
    pub full_path: String,
    #[serde(default)]
    pub file_mtime: Option<i64>,
    #[serde(default)]
    pub first_prompt: Option<String>,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub message_count: Option<i32>,
    pub created: String,
    pub modified: String,
    #[serde(default)]
    pub git_branch: Option<String>,
    pub project_path: String,
    #[serde(default)]
    pub is_sidechain: bool,
}

impl From<ClaudeSessionIndexEntry> for ClaudeSession {
    fn from(entry: ClaudeSessionIndexEntry) -> Self {
        let last_updated = entry.file_mtime.and_then(|ms| {
            chrono::DateTime::from_timestamp_millis(ms).map(|dt| dt.to_rfc3339())
        });

        Self {
            session_id: entry.session_id,
            full_path: entry.full_path,
            first_prompt: entry.first_prompt,
            summary: entry.summary,
            message_count: entry.message_count.unwrap_or(0),
            created: entry.created,
            modified: entry.modified,
            last_updated,
            git_branch: entry.git_branch,
            project_path: entry.project_path,
            is_sidechain: entry.is_sidechain,
        }
    }
}

/// A message in a Claude Code conversation
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeMessage {
    pub uuid: String,
    #[serde(rename = "type")]
    pub message_type: String,
    pub timestamp: String,
    /// Message text content (extracted from various content formats)
    #[serde(default)]
    pub text: Option<String>,
    /// Tool use blocks in this message (for assistant messages)
    #[serde(default)]
    pub tool_uses: Vec<ClaudeToolUse>,
    /// Structured content blocks in source order
    #[serde(default)]
    pub blocks: Vec<ClaudeContentBlock>,
    /// Model used for this message (for assistant messages)
    #[serde(default)]
    pub model: Option<String>,
}

/// Structured content block extracted from message content
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeContentBlock {
    #[serde(rename = "type")]
    pub block_type: String,
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default)]
    pub tool_use_id: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    /// JSON string for tool input
    #[serde(default)]
    pub input: Option<String>,
    /// JSON string for tool result/output
    #[serde(default)]
    pub output: Option<String>,
    /// Full raw JSON object for this block or related tool result payload
    #[serde(default)]
    pub raw_json: Option<String>,
    /// File path when tool result contains file payload
    #[serde(default)]
    pub file_path: Option<String>,
    /// File content when tool result contains file payload
    #[serde(default)]
    pub file_content: Option<String>,
    #[serde(default)]
    pub is_error: Option<bool>,
}

/// Tool use information
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeToolUse {
    pub id: String,
    pub name: String,
    /// Tool input as JSON string
    #[serde(default)]
    pub input: Option<String>,
}

/// Session statistics (tokens, cost, duration)
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeSessionStats {
    pub total_input_tokens: i32,
    pub total_output_tokens: i32,
    pub total_cache_read_tokens: i32,
    pub total_cache_creation_tokens: i32,
    pub estimated_cost_usd: f64,
    pub duration_seconds: i32,
}

/// Full session detail with messages
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeSessionDetail {
    pub session: ClaudeSession,
    pub messages: Vec<ClaudeMessage>,
    pub stats: ClaudeSessionStats,
}

/// Raw message from JSONL file (internal)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawClaudeMessage {
    #[serde(rename = "type")]
    pub message_type: String,
    #[serde(default)]
    pub uuid: Option<String>,
    #[serde(default)]
    pub timestamp: Option<String>,
    #[serde(default)]
    pub message: Option<RawMessageData>,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub tool_use_result: Option<serde_json::Value>,
}

/// Raw message data structure (internal)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawMessageData {
    #[serde(default)]
    #[allow(dead_code)]
    pub role: Option<String>,
    #[serde(default)]
    pub content: Option<serde_json::Value>,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub usage: Option<RawUsage>,
}

/// Token usage data (internal)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct RawUsage {
    #[serde(default)]
    pub input_tokens: Option<i64>,
    #[serde(default)]
    pub output_tokens: Option<i64>,
    #[serde(default)]
    pub cache_read_input_tokens: Option<i64>,
    #[serde(default)]
    pub cache_creation_input_tokens: Option<i64>,
}
