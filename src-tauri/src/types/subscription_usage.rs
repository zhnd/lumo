//! Subscription usage types
//!
//! Types for Claude Pro/Max subscription usage scraped from claude.ai/settings/usage.

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

/// A single usage category (e.g. "Current session", "All models", "Extra usage")
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionUsageCategory {
    pub name: String,
    pub label: String,
    pub percent_used: f64,
    pub resets_in: Option<String>,
    pub amount_spent: Option<String>,
    pub amount_limit: Option<String>,
    pub amount_balance: Option<String>,
}

/// Full subscription usage snapshot
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionUsage {
    pub categories: Vec<SubscriptionUsageCategory>,
    pub fetched_at: f64,
    /// Set by JS extraction when page content exists but no known sections matched.
    /// Internal field — deserialized from JS result, not serialized to frontend.
    #[serde(default, skip_serializing)]
    pub parse_error: Option<bool>,
}

/// Result of a subscription usage fetch attempt
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionUsageResult {
    pub needs_login: bool,
    pub usage: Option<SubscriptionUsage>,
    pub error: Option<String>,
    /// Set when the page loaded but known usage sections could not be parsed.
    /// Distinguishes "no subscription" (empty categories, parse_error=false)
    /// from "page changed / parse failure" (empty categories, parse_error=true).
    pub parse_error: bool,
}

/// Payload emitted with the `claude-login-resolved` event.
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResolvedPayload {
    /// "success" | "cancelled" | "timeout"
    pub status: String,
}
