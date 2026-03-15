//! Notification settings commands
//!
//! IPC handlers for notification preference management.

use sqlx::SqlitePool;
use tauri::{command, AppHandle, Manager};

use crate::services::{ClaudeConfigService, NotificationSettingsService};
use crate::types::{
    NotificationSettingResponse, TerminalNotifChannel, UpdateNotificationSettingRequest,
};

/// Get all notification settings
#[command]
pub async fn get_notification_settings(
    app_handle: AppHandle,
) -> Result<Vec<NotificationSettingResponse>, String> {
    let pool = app_handle.state::<SqlitePool>();
    NotificationSettingsService::get_all(&pool)
        .await
        .map_err(|e| e.to_string())
}

/// Update a notification setting
#[command]
pub async fn update_notification_setting(
    app_handle: AppHandle,
    request: UpdateNotificationSettingRequest,
) -> Result<(), String> {
    let pool = app_handle.state::<SqlitePool>();
    NotificationSettingsService::update(&pool, request)
        .await
        .map_err(|e| e.to_string())
}

/// Get Claude Code's terminal notification channel setting
#[command]
pub async fn get_terminal_notif_channel() -> Result<TerminalNotifChannel, String> {
    let raw = ClaudeConfigService::get_preferred_notif_channel().map_err(|e| e.to_string())?;
    Ok(TerminalNotifChannel::from_str_value(raw.as_deref()))
}

/// Set Claude Code's terminal notification channel setting
#[command]
pub async fn set_terminal_notif_channel(channel: TerminalNotifChannel) -> Result<(), String> {
    ClaudeConfigService::set_preferred_notif_channel(channel.as_str_value())
        .map_err(|e| e.to_string())
}
