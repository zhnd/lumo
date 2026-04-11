//! Insights commands
//!
//! Tauri IPC commands for generating and viewing Claude Code insights reports.

use tauri::command;

use crate::services::InsightsService;
use crate::types::InsightsReport;

/// List available insights reports
#[command]
pub async fn list_insights_reports() -> Result<Vec<InsightsReport>, String> {
    InsightsService::list_reports()
        .await
        .map_err(|e| e.to_string())
}

/// Generate a new insights report via `claude /insights`
#[command]
pub async fn generate_insights_report() -> Result<String, String> {
    InsightsService::generate_report()
        .await
        .map_err(|e| e.to_string())
}

/// Read the HTML content of a specific report
#[command]
pub async fn read_insights_report(path: String) -> Result<String, String> {
    InsightsService::read_report(path)
        .await
        .map_err(|e| e.to_string())
}
