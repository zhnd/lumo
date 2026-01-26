//! Session entity
//!
//! Represents an aggregated session from events.
//! This corresponds to the `sessions` VIEW in the database.

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Session entity (from the sessions view)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub start_time: i64,
    pub end_time: i64,
    pub duration_ms: i64,
    pub event_count: i64,
    pub api_request_count: i64,
    pub error_count: i64,
    pub tool_use_count: i64,
    pub prompt_count: i64,
    pub total_cost_usd: f64,
    pub total_input_tokens: i64,
    pub total_output_tokens: i64,
    pub total_cache_read_tokens: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account_uuid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub organization_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub terminal_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub app_version: Option<String>,
}
