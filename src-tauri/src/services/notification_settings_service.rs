//! Notification settings service
//!
//! Business logic for managing per-event notification preferences.

use anyhow::Result;
use shared::{NewNotificationSetting, NotificationSettingRepository};
use sqlx::SqlitePool;

use crate::types::{NotificationSettingResponse, UpdateNotificationSettingRequest};

pub struct NotificationSettingsService;

impl NotificationSettingsService {
    /// Get all notification settings
    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<NotificationSettingResponse>> {
        let settings = NotificationSettingRepository::find_all(pool).await?;
        Ok(settings
            .into_iter()
            .map(NotificationSettingResponse::from)
            .collect())
    }

    /// Update a notification setting
    pub async fn update(
        pool: &SqlitePool,
        request: UpdateNotificationSettingRequest,
    ) -> Result<()> {
        let setting = NewNotificationSetting {
            hook_event: request.hook_event,
            enabled: request.enabled,
            show_banner: request.show_banner,
            play_sound: request.play_sound,
        };
        NotificationSettingRepository::upsert(pool, &setting).await?;
        Ok(())
    }
}
