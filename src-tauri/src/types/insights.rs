//! Insights report types

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

/// A previously generated insights HTML report
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsightsReport {
    /// Absolute file path
    pub path: String,
    /// File name (e.g. "report.html")
    pub file_name: String,
    /// Last modified time as millisecond timestamp
    pub created_at: f64,
}
