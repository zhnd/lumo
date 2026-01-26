//! Entity types for API responses
//!
//! These types correspond to database entities but are specifically
//! designed for API exposure with typeshare annotations.

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

/// Session entity for API responses
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub start_time: i32,
    pub end_time: i32,
    pub duration_ms: i32,
    pub event_count: i32,
    pub api_request_count: i32,
    pub error_count: i32,
    pub tool_use_count: i32,
    pub prompt_count: i32,
    pub total_cost_usd: f32,
    pub total_input_tokens: i32,
    pub total_output_tokens: i32,
    pub total_cache_read_tokens: i32,
    pub account_uuid: Option<String>,
    pub organization_id: Option<String>,
    pub terminal_type: Option<String>,
    pub app_version: Option<String>,
}

impl From<shared::Session> for Session {
    fn from(s: shared::Session) -> Self {
        Self {
            id: s.id,
            start_time: s.start_time as i32,
            end_time: s.end_time as i32,
            duration_ms: s.duration_ms as i32,
            event_count: s.event_count as i32,
            api_request_count: s.api_request_count as i32,
            error_count: s.error_count as i32,
            tool_use_count: s.tool_use_count as i32,
            prompt_count: s.prompt_count as i32,
            total_cost_usd: s.total_cost_usd as f32,
            total_input_tokens: s.total_input_tokens as i32,
            total_output_tokens: s.total_output_tokens as i32,
            total_cache_read_tokens: s.total_cache_read_tokens as i32,
            account_uuid: s.account_uuid,
            organization_id: s.organization_id,
            terminal_type: s.terminal_type,
            app_version: s.app_version,
        }
    }
}
