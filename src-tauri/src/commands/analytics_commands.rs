//! Analytics commands
//!
//! Tauri IPC commands for analytics insights.

use sqlx::SqlitePool;
use tauri::{command, AppHandle, Manager};

use crate::services::AnalyticsService;
use crate::types::{
    ActivityDay, CacheHitTrend, ErrorRateStats, HourlyActivity, SessionBucket, TimeRange,
};

/// Get hourly activity distribution
#[command]
pub async fn get_hourly_activity(
    app_handle: AppHandle,
    time_range: TimeRange,
) -> Result<Vec<HourlyActivity>, String> {
    let pool = app_handle.state::<SqlitePool>();
    AnalyticsService::get_hourly_activity(&pool, time_range)
        .await
        .map_err(|e| e.to_string())
}

/// Get session length distribution
#[command]
pub async fn get_session_length_distribution(
    app_handle: AppHandle,
    time_range: TimeRange,
) -> Result<Vec<SessionBucket>, String> {
    let pool = app_handle.state::<SqlitePool>();
    AnalyticsService::get_session_length_distribution(&pool, time_range)
        .await
        .map_err(|e| e.to_string())
}

/// Get error rate statistics
#[command]
pub async fn get_error_rate(
    app_handle: AppHandle,
    time_range: TimeRange,
) -> Result<ErrorRateStats, String> {
    let pool = app_handle.state::<SqlitePool>();
    AnalyticsService::get_error_rate(&pool, time_range)
        .await
        .map_err(|e| e.to_string())
}

/// Get cache hit rate trend over time
#[command]
pub async fn get_cache_hit_trend(
    app_handle: AppHandle,
    time_range: TimeRange,
) -> Result<Vec<CacheHitTrend>, String> {
    let pool = app_handle.state::<SqlitePool>();
    AnalyticsService::get_cache_hit_trend(&pool, time_range)
        .await
        .map_err(|e| e.to_string())
}

/// Get activity heatmap data (last 90 days)
#[command]
pub async fn get_activity_heatmap(app_handle: AppHandle) -> Result<Vec<ActivityDay>, String> {
    let pool = app_handle.state::<SqlitePool>();
    AnalyticsService::get_activity_heatmap(&pool)
        .await
        .map_err(|e| e.to_string())
}
