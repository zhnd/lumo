//! Analytics types
//!
//! Types for analytics insights and deep analysis.

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

/// Hourly activity distribution
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HourlyActivity {
    pub hour: i32,
    pub count: i32,
}

/// Session length distribution bucket
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionBucket {
    pub bucket: String,
    pub count: i32,
}

/// Error rate statistics
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorRateStats {
    pub total_requests: i32,
    pub total_errors: i32,
    pub error_rate: f32,
}

/// Daily activity for heatmap
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityDay {
    pub date: String,
    pub count: i32,
}

/// Cache hit rate trend data point
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheHitTrend {
    pub date: String,
    pub rate: f32,
}
