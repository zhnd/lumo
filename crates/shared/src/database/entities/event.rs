//! Event entity
//!
//! Represents OTLP log events from Claude Code.

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Database row representation of an event
#[derive(Debug, Clone, FromRow)]
pub struct EventRow {
    pub id: String,
    pub session_id: String,
    pub name: String,
    pub timestamp: i64,
    pub duration_ms: Option<i64>,
    pub success: Option<i32>,
    pub error: Option<String>,
    pub model: Option<String>,
    pub cost_usd: Option<f64>,
    pub input_tokens: Option<i64>,
    pub output_tokens: Option<i64>,
    pub cache_read_tokens: Option<i64>,
    pub cache_creation_tokens: Option<i64>,
    pub status_code: Option<i32>,
    pub attempt: Option<i32>,
    pub tool_name: Option<String>,
    pub tool_decision: Option<String>,
    pub decision_source: Option<String>,
    pub tool_parameters: Option<String>,
    pub prompt_length: Option<i64>,
    pub prompt: Option<String>,
    pub account_uuid: Option<String>,
    pub organization_id: Option<String>,
    pub terminal_type: Option<String>,
    pub app_version: Option<String>,
    pub resource: Option<String>,
    pub received_at: String,
}

/// Event entity for internal use
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub id: String,
    pub session_id: String,
    pub name: String,
    pub timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub success: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost_usd: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_tokens: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_tokens: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cache_read_tokens: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cache_creation_tokens: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status_code: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attempt: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_decision: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decision_source: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_parameters: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_length: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account_uuid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub organization_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub terminal_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub app_version: Option<String>,
    pub received_at: String,
}

/// New event for insertion
#[derive(Debug, Clone)]
pub struct NewEvent {
    pub id: String,
    pub session_id: String,
    pub name: String,
    pub timestamp: i64,
    pub duration_ms: Option<i64>,
    pub success: Option<bool>,
    pub error: Option<String>,
    pub model: Option<String>,
    pub cost_usd: Option<f64>,
    pub input_tokens: Option<i64>,
    pub output_tokens: Option<i64>,
    pub cache_read_tokens: Option<i64>,
    pub cache_creation_tokens: Option<i64>,
    pub status_code: Option<i32>,
    pub attempt: Option<i32>,
    pub tool_name: Option<String>,
    pub tool_decision: Option<String>,
    pub decision_source: Option<String>,
    pub tool_parameters: Option<String>,
    pub prompt_length: Option<i64>,
    pub prompt: Option<String>,
    pub account_uuid: Option<String>,
    pub organization_id: Option<String>,
    pub terminal_type: Option<String>,
    pub app_version: Option<String>,
    pub resource: Option<String>,
}

impl From<EventRow> for Event {
    fn from(row: EventRow) -> Self {
        Self {
            id: row.id,
            session_id: row.session_id,
            name: row.name,
            timestamp: row.timestamp,
            duration_ms: row.duration_ms,
            success: row.success.map(|v| v != 0),
            error: row.error,
            model: row.model,
            cost_usd: row.cost_usd,
            input_tokens: row.input_tokens,
            output_tokens: row.output_tokens,
            cache_read_tokens: row.cache_read_tokens,
            cache_creation_tokens: row.cache_creation_tokens,
            status_code: row.status_code,
            attempt: row.attempt,
            tool_name: row.tool_name,
            tool_decision: row.tool_decision,
            decision_source: row.decision_source,
            tool_parameters: row.tool_parameters,
            prompt_length: row.prompt_length,
            prompt: row.prompt,
            account_uuid: row.account_uuid,
            organization_id: row.organization_id,
            terminal_type: row.terminal_type,
            app_version: row.app_version,
            received_at: row.received_at,
        }
    }
}
