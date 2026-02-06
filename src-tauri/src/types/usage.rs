//! Usage types
//!
//! Types for Anthropic API rate limit / usage information.

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

/// Rate limit header from Anthropic API response
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RateLimitHeader {
    pub name: String,
    pub value: String,
}

/// Usage limits from Anthropic API
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageLimits {
    pub status: String,
    pub resets_at: Option<String>,
    pub headers: Vec<RateLimitHeader>,
}
