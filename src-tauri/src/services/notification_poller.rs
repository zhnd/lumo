//! Notification poller
//!
//! Background task that polls for unnotified notifications and sends
//! macOS native notifications via the Tauri notification plugin.

use shared::NotificationRepository;
use sqlx::SqlitePool;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

const POLL_INTERVAL: Duration = Duration::from_secs(3);

/// Start the notification polling loop.
/// Should be spawned after the database is initialized.
pub fn start(app_handle: AppHandle) {
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(POLL_INTERVAL).await;
            if let Err(e) = poll_and_notify(&app_handle).await {
                log::error!("Notification poller error: {}", e);
            }
        }
    });
}

async fn poll_and_notify(app_handle: &AppHandle) -> anyhow::Result<()> {
    let pool = app_handle.state::<SqlitePool>();
    let pending = NotificationRepository::find_unnotified(&pool).await?;

    if pending.is_empty() {
        return Ok(());
    }

    let ids: Vec<i64> = pending.iter().map(|n| n.id).collect();

    for notif in &pending {
        if let Err(e) = app_handle
            .notification()
            .builder()
            .title(&notif.title)
            .body(&notif.message)
            .show()
        {
            log::warn!("Failed to send OS notification: {}", e);
        }
    }

    NotificationRepository::mark_notified(&pool, &ids).await?;
    log::info!("Sent {} OS notification(s)", ids.len());

    Ok(())
}
