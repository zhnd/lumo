//! Usage commands
//!
//! Tauri IPC commands for API key management and usage limit queries.

use tauri::command;

use crate::services::{ConfigService, UsageService};
use crate::types::UsageLimits;

/// Get usage limits from Anthropic API
#[command]
pub async fn get_usage_limits() -> Result<UsageLimits, String> {
    let api_key = ConfigService::get_api_key()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "API key not configured".to_string())?;

    UsageService::fetch_usage_limits(&api_key)
        .await
        .map_err(|e| e.to_string())
}

/// Save Anthropic API key
#[command]
pub async fn save_api_key(api_key: String) -> Result<(), String> {
    ConfigService::save_api_key(&api_key).map_err(|e| e.to_string())
}

/// Check if API key is configured
#[command]
pub async fn has_api_key() -> Result<bool, String> {
    Ok(ConfigService::has_api_key())
}

/// Delete stored API key
#[command]
pub async fn delete_api_key() -> Result<(), String> {
    ConfigService::delete_api_key().map_err(|e| e.to_string())
}
