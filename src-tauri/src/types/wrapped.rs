//! Wrapped types
//!
//! Types for the personal report card (Wrapped) feature.

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

/// Period filter for wrapped data
#[typeshare]
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WrappedPeriod {
    Today,
    Week,
    Month,
    All,
}

/// Aggregated wrapped data for all cards
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WrappedData {
    // Hero
    pub total_sessions: i32,
    pub total_active_hours: f32,
    // Output
    pub lines_of_code_added: i32,
    pub lines_of_code_removed: i32,
    pub commits: i32,
    // Cost
    pub total_cost: f32,
    pub daily_avg_cost: f32,
    pub cost_per_session: f32,
    pub cost_sparkline: Vec<f32>,
    // Preferences
    pub top_model: String,
    pub top_model_percentage: f32,
    pub top_tool: String,
    pub top_tool_count: i32,
    // Habits
    pub longest_streak_days: i32,
    pub peak_hour: i32,
    pub peak_hour_label: String,
}
