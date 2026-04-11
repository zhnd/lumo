//! Subscription usage commands
//!
//! Tauri IPC commands for fetching Claude subscription usage via OAuth API.

use tauri::command;

use crate::services::SubscriptionUsageService;
use crate::types::SubscriptionUsageResult;

/// Fetch subscription usage from Anthropic's OAuth API
#[command]
pub async fn fetch_subscription_usage() -> Result<SubscriptionUsageResult, String> {
    SubscriptionUsageService::fetch_usage()
        .await
        .map_err(|e| e.to_string())
}
