//! Notification setting repository
//!
//! Provides CRUD operations for notification settings.

use sqlx::SqlitePool;

use crate::database::entities::{
    NewNotificationSetting, NotificationSetting, NotificationSettingRow,
};
use crate::error::Result;

/// Repository for notification setting operations
pub struct NotificationSettingRepository;

impl NotificationSettingRepository {
    /// Get all notification settings
    pub async fn find_all(pool: &SqlitePool) -> Result<Vec<NotificationSetting>> {
        let rows: Vec<NotificationSettingRow> =
            sqlx::query_as(r#"SELECT * FROM notification_settings ORDER BY hook_event ASC"#)
                .fetch_all(pool)
                .await?;

        Ok(rows.into_iter().map(NotificationSetting::from).collect())
    }

    /// Find a setting by hook event key (e.g. "Stop", "Notification:idle_prompt")
    pub async fn find_by_hook_event(
        pool: &SqlitePool,
        hook_event: &str,
    ) -> Result<Option<NotificationSetting>> {
        let row: Option<NotificationSettingRow> =
            sqlx::query_as(r#"SELECT * FROM notification_settings WHERE hook_event = ?"#)
                .bind(hook_event)
                .fetch_optional(pool)
                .await?;

        Ok(row.map(NotificationSetting::from))
    }

    /// Insert or update a notification setting
    pub async fn upsert(pool: &SqlitePool, setting: &NewNotificationSetting) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO notification_settings (hook_event, enabled, show_banner, play_sound, updated_at)
            VALUES (?, ?, ?, ?, unixepoch() * 1000)
            ON CONFLICT(hook_event) DO UPDATE SET
                enabled = excluded.enabled,
                show_banner = excluded.show_banner,
                play_sound = excluded.play_sound,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&setting.hook_event)
        .bind(setting.enabled as i32)
        .bind(setting.show_banner as i32)
        .bind(setting.play_sound as i32)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Get the effective setting for a notification.
    ///
    /// Resolution order (most specific → least specific):
    ///   1. Exact match: `Notification:permission_prompt`
    ///   2. Category catch-all: `Notification:*`
    ///   3. Global default: `*`
    ///
    /// For non-Notification events (Stop, SubagentStop):
    ///   1. Exact match: `Stop`
    ///   2. Global default: `*`
    pub async fn find_effective(
        pool: &SqlitePool,
        hook_event: &str,
        notification_type: Option<&str>,
    ) -> Result<Option<NotificationSetting>> {
        // Build composite key for Notification events
        let specific_key = if hook_event == "Notification" {
            notification_type.map(|t| format!("Notification:{}", t))
        } else {
            None
        };

        // 1. Try exact match (e.g. "Notification:permission_prompt" or "Stop")
        let exact_key = specific_key.as_deref().unwrap_or(hook_event);
        if let Some(setting) = Self::find_by_hook_event(pool, exact_key).await? {
            return Ok(Some(setting));
        }

        // 2. For Notification events, try category catch-all "Notification:*"
        if hook_event == "Notification" {
            if let Some(setting) = Self::find_by_hook_event(pool, "Notification:*").await? {
                return Ok(Some(setting));
            }
        }

        // 3. Fall back to global default "*"
        Self::find_by_hook_event(pool, "*").await
    }
}
