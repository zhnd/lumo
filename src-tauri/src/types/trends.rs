//! Trends types
//!
//! Types for usage trends and time series data.

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

/// Usage trend data point (for charts)
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageTrend {
    pub date: String,
    pub cost: f32,
    pub input_tokens: i32,
    pub output_tokens: i32,
    pub cache_read_tokens: i32,
}
