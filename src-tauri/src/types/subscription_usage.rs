//! Subscription usage types
//!
//! Types for Claude Pro/Max subscription usage fetched from Anthropic's OAuth API.

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

/// A single usage bucket (e.g. 5-hour session, 7-day weekly)
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageBucket {
    /// Usage percentage (0-100)
    pub utilization: Option<f64>,
    /// ISO 8601 reset time
    pub resets_at: Option<String>,
}

/// Extra usage (pay-as-you-go overage)
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtraUsage {
    pub is_enabled: bool,
    /// Usage percentage (0-100)
    pub utilization: Option<f64>,
    /// Credits used in minor units (cents)
    pub used_credits: Option<f64>,
    /// Monthly limit in minor units (cents)
    pub monthly_limit: Option<f64>,
}

/// Full subscription usage response from the OAuth API
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionUsageResponse {
    pub five_hour: Option<UsageBucket>,
    pub seven_day: Option<UsageBucket>,
    pub seven_day_opus: Option<UsageBucket>,
    pub seven_day_sonnet: Option<UsageBucket>,
    pub extra_usage: Option<ExtraUsage>,
}

/// Result of a subscription usage fetch attempt
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionUsageResult {
    pub needs_login: bool,
    pub usage: Option<SubscriptionUsageResponse>,
    pub error: Option<String>,
    /// Subscription tier badge (e.g. "MAX", "PRO", "API")
    pub subscription_type: Option<String>,
}
