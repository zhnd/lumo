//! Subscription usage commands
//!
//! Tauri IPC commands for fetching Claude subscription usage via hidden webview.

use tauri::{command, AppHandle};

use crate::services::SubscriptionUsageService;
use crate::types::SubscriptionUsageResult;

/// Fetch subscription usage from claude.ai/settings/usage
#[command]
pub async fn fetch_subscription_usage(
    app_handle: AppHandle,
) -> Result<SubscriptionUsageResult, String> {
    SubscriptionUsageService::fetch_usage(&app_handle)
        .await
        .map_err(|e| e.to_string())
}

/// Show the claude.ai login webview for user authentication
#[command]
pub async fn show_claude_login(app_handle: AppHandle) -> Result<(), String> {
    SubscriptionUsageService::show_login(&app_handle).map_err(|e| e.to_string())
}

/// Hide the claude.ai login webview after authentication
#[command]
pub async fn hide_claude_login(app_handle: AppHandle) -> Result<(), String> {
    SubscriptionUsageService::hide_login(&app_handle).map_err(|e| e.to_string())
}

/// Logout from claude.ai by destroying the webview session
#[command]
pub async fn logout_claude(app_handle: AppHandle) -> Result<(), String> {
    SubscriptionUsageService::logout(&app_handle).map_err(|e| e.to_string())
}
