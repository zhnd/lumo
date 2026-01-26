//! Stats commands
//!
//! Tauri IPC commands for statistics operations.

use sqlx::SqlitePool;
use tauri::{command, AppHandle, Manager};

use crate::services::StatsService;
use crate::types::{ModelStats, SummaryStats, TimeRange, TokenStats};

/// Get summary statistics for a time range
#[command]
pub async fn get_summary_stats(
    app_handle: AppHandle,
    time_range: TimeRange,
) -> Result<SummaryStats, String> {
    let pool = app_handle.state::<SqlitePool>();
    StatsService::get_summary(&pool, time_range)
        .await
        .map_err(|e| e.to_string())
}

/// Get model usage statistics for a time range
#[command]
pub async fn get_model_stats(
    app_handle: AppHandle,
    time_range: TimeRange,
) -> Result<Vec<ModelStats>, String> {
    let pool = app_handle.state::<SqlitePool>();
    StatsService::get_model_stats(&pool, time_range)
        .await
        .map_err(|e| e.to_string())
}

/// Get token statistics by model for a time range
#[command]
pub async fn get_token_stats(
    app_handle: AppHandle,
    time_range: TimeRange,
) -> Result<Vec<TokenStats>, String> {
    let pool = app_handle.state::<SqlitePool>();
    StatsService::get_token_stats(&pool, time_range)
        .await
        .map_err(|e| e.to_string())
}
