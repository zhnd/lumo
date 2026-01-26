//! Trends commands
//!
//! Tauri IPC commands for trends operations.

use sqlx::SqlitePool;
use tauri::{command, AppHandle, Manager};

use crate::services::TrendsService;
use crate::types::{TimeRange, UsageTrend};

/// Get usage trends for a time range
#[command]
pub async fn get_usage_trends(
    app_handle: AppHandle,
    time_range: TimeRange,
) -> Result<Vec<UsageTrend>, String> {
    let pool = app_handle.state::<SqlitePool>();
    TrendsService::get_usage_trends(&pool, time_range)
        .await
        .map_err(|e| e.to_string())
}
