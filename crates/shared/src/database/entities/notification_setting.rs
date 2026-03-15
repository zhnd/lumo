//! Notification setting entity
//!
//! Represents per-event notification preferences.

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Database row representation of a notification setting
#[derive(Debug, Clone, FromRow)]
pub struct NotificationSettingRow {
    pub id: i64,
    pub hook_event: String,
    pub enabled: i32,
    pub show_banner: i32,
    pub play_sound: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Notification setting domain type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSetting {
    pub id: i64,
    pub hook_event: String,
    pub enabled: bool,
    pub show_banner: bool,
    pub play_sound: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

/// New notification setting for upsert
#[derive(Debug, Clone)]
pub struct NewNotificationSetting {
    pub hook_event: String,
    pub enabled: bool,
    pub show_banner: bool,
    pub play_sound: bool,
}

impl From<NotificationSettingRow> for NotificationSetting {
    fn from(row: NotificationSettingRow) -> Self {
        Self {
            id: row.id,
            hook_event: row.hook_event,
            enabled: row.enabled != 0,
            show_banner: row.show_banner != 0,
            play_sound: row.play_sound != 0,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}
