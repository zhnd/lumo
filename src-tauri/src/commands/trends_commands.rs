//! Trends commands
//!
//! Tauri IPC commands for trends operations.

use sqlx::SqlitePool;
use tauri::{command, AppHandle, Manager};

use crate::services::TrendsService;
use crate::types::{CostByModelTrend, CostEfficiencyTrend, TimeRange, UsageTrend};

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

/// Get cost efficiency trend (cost per session over time)
#[command]
pub async fn get_cost_efficiency_trend(
    app_handle: AppHandle,
    time_range: TimeRange,
) -> Result<Vec<CostEfficiencyTrend>, String> {
    let pool = app_handle.state::<SqlitePool>();
    TrendsService::get_cost_efficiency_trend(&pool, time_range)
        .await
        .map_err(|e| e.to_string())
}

/// Get cost trends grouped by model
#[command]
pub async fn get_cost_by_model_trends(
    app_handle: AppHandle,
    time_range: TimeRange,
) -> Result<Vec<CostByModelTrend>, String> {
    let pool = app_handle.state::<SqlitePool>();
    TrendsService::get_cost_by_model_trends(&pool, time_range)
        .await
        .map_err(|e| e.to_string())
}
