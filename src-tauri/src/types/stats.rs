//! Statistics types
//!
//! Types for summary statistics, model breakdowns, and token statistics.

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

/// Time range filter for queries
#[typeshare]
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TimeRange {
    Today,
    Week,
    Month,
}

/// Summary statistics for a time period
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SummaryStats {
    pub total_cost: f32,
    pub total_tokens: i32,
    pub cache_tokens: i32,
    pub cache_percentage: f32,
    pub active_time_seconds: i32,
    pub total_sessions: i32,
    pub today_sessions: i32,
    pub cost_change_percent: f32,
    // Metric counters from metrics table
    pub lines_of_code_added: i32,
    pub lines_of_code_removed: i32,
    pub pull_requests: i32,
    pub commits: i32,
    pub code_edit_accepts: i32,
    pub code_edit_rejects: i32,
}

/// Model usage statistics
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStats {
    pub model: String,
    pub display_name: String,
    pub cost: f32,
    pub requests: i32,
    pub tokens: i32,
}

/// Token breakdown by model
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenStats {
    pub model: String,
    pub display_name: String,
    pub input: i32,
    pub output: i32,
    pub cache_read: i32,
    pub cache_creation: i32,
}

/// Format model identifier to display name
pub fn format_model_display_name(model: &str) -> String {
    let model_lower = model.to_lowercase();

    if model_lower.contains("opus") {
        if model_lower.contains("4-5") || model_lower.contains("4.5") {
            "Opus 4.5".to_string()
        } else if model_lower.contains("4") {
            "Opus 4".to_string()
        } else {
            "Opus".to_string()
        }
    } else if model_lower.contains("sonnet") {
        if model_lower.contains("4-5") || model_lower.contains("4.5") {
            "Sonnet 4.5".to_string()
        } else if model_lower.contains("-4-") || model_lower.ends_with("-4") {
            "Sonnet 4".to_string()
        } else if model_lower.contains("3-5") || model_lower.contains("3.5") {
            "Sonnet 3.5".to_string()
        } else {
            "Sonnet".to_string()
        }
    } else if model_lower.contains("haiku") {
        if model_lower.contains("3-5") || model_lower.contains("3.5") {
            "Haiku 3.5".to_string()
        } else if model_lower.contains("3") {
            "Haiku 3".to_string()
        } else {
            "Haiku".to_string()
        }
    } else {
        model.to_string()
    }
}
