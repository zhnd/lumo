//! Marketplace types
//!
//! Types for the Claude Code plugin marketplace feature.

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

/// Scope where a plugin is installed
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginInstalledScope {
    /// "user" or "project"
    pub scope: String,
    /// Project path (only when scope is "project")
    pub project_path: Option<String>,
}

/// A plugin available in a marketplace
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplacePlugin {
    pub name: String,
    pub description: String,
    pub version: Option<String>,
    pub category: Option<String>,
    pub marketplace_name: String,
    pub installed_scopes: Vec<PluginInstalledScope>,
    pub install_count: Option<f64>,
    pub author_name: Option<String>,
    pub homepage: Option<String>,
    pub tags: Vec<String>,
}

/// A configured marketplace source
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceInfo {
    pub name: String,
    pub description: String,
    pub owner_name: Option<String>,
    pub plugin_count: f64,
    pub last_updated: Option<String>,
}

/// Result of a marketplace command
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceCommandResult {
    pub success: bool,
    pub message: String,
}
