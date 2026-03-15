//! Notification settings types
//!
//! Types for notification preferences per hook event.

use serde::{Deserialize, Serialize};
use shared::NotificationSetting;
use typeshare::typeshare;

/// Notification setting response
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSettingResponse {
    pub hook_event: String,
    pub enabled: bool,
    pub show_banner: bool,
    pub play_sound: bool,
}

/// Request to update a notification setting
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNotificationSettingRequest {
    pub hook_event: String,
    pub enabled: bool,
    pub show_banner: bool,
    pub play_sound: bool,
}

/// Claude Code terminal notification channel options
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TerminalNotifChannel {
    Auto,
    Iterm2,
    Iterm2WithBell,
    TerminalBell,
    Kitty,
    Ghostty,
    NotificationsDisabled,
}

impl TerminalNotifChannel {
    /// Convert from the raw string stored in ~/.claude.json.
    /// None means the key is absent → Auto.
    pub fn from_str_value(value: Option<&str>) -> Self {
        match value {
            Some("iterm2") => Self::Iterm2,
            Some("iterm2_with_bell") => Self::Iterm2WithBell,
            Some("terminal_bell") => Self::TerminalBell,
            Some("kitty") => Self::Kitty,
            Some("ghostty") => Self::Ghostty,
            Some("notifications_disabled") => Self::NotificationsDisabled,
            _ => Self::Auto,
        }
    }

    /// Convert to the raw string for writing to ~/.claude.json.
    /// Auto returns None (key should be removed).
    pub fn as_str_value(&self) -> Option<&str> {
        match self {
            Self::Auto => None,
            Self::Iterm2 => Some("iterm2"),
            Self::Iterm2WithBell => Some("iterm2_with_bell"),
            Self::TerminalBell => Some("terminal_bell"),
            Self::Kitty => Some("kitty"),
            Self::Ghostty => Some("ghostty"),
            Self::NotificationsDisabled => Some("notifications_disabled"),
        }
    }
}

impl From<NotificationSetting> for NotificationSettingResponse {
    fn from(s: NotificationSetting) -> Self {
        Self {
            hook_event: s.hook_event,
            enabled: s.enabled,
            show_banner: s.show_banner,
            play_sound: s.play_sound,
        }
    }
}
