//! Marketplace commands
//!
//! Tauri IPC commands for browsing and managing Claude Code plugin marketplaces.

use tauri::command;

use crate::services::MarketplaceService;
use crate::types::{MarketplaceCommandResult, MarketplaceInfo, MarketplacePlugin};

/// List all plugins available across configured marketplaces.
#[command]
pub async fn list_marketplace_plugins() -> Result<Vec<MarketplacePlugin>, String> {
    MarketplaceService::list_plugins()
        .await
        .map_err(|e| e.to_string())
}

/// List configured marketplace sources.
#[command]
pub async fn list_marketplaces() -> Result<Vec<MarketplaceInfo>, String> {
    MarketplaceService::list_marketplaces()
        .await
        .map_err(|e| e.to_string())
}

/// Install a plugin from marketplace.
#[command]
pub async fn install_marketplace_plugin(
    name: String,
    project_path: Option<String>,
) -> Result<MarketplaceCommandResult, String> {
    MarketplaceService::install_plugin(&name, project_path.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// Uninstall a plugin.
#[command]
pub async fn uninstall_marketplace_plugin(
    name: String,
    project_path: Option<String>,
) -> Result<MarketplaceCommandResult, String> {
    MarketplaceService::uninstall_plugin(&name, project_path.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// Add a marketplace source (URL, path, or GitHub repo).
#[command]
pub async fn add_marketplace(source: String) -> Result<MarketplaceCommandResult, String> {
    MarketplaceService::add_marketplace(&source)
        .await
        .map_err(|e| e.to_string())
}

/// Remove a configured marketplace by name.
#[command]
pub async fn remove_marketplace(name: String) -> Result<MarketplaceCommandResult, String> {
    MarketplaceService::remove_marketplace(&name)
        .await
        .map_err(|e| e.to_string())
}

/// Update all marketplace sources.
#[command]
pub async fn update_marketplaces() -> Result<MarketplaceCommandResult, String> {
    MarketplaceService::update_marketplaces()
        .await
        .map_err(|e| e.to_string())
}
