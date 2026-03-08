//! Marketplace service
//!
//! Service for browsing and managing Claude Code plugin marketplaces.
//! Reads marketplace data from ~/.claude/plugins/marketplaces/.

use anyhow::{Context, Result};
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use crate::types::{MarketplaceCommandResult, MarketplaceInfo, MarketplacePlugin, PluginInstalledScope};

/// Marketplace manifest JSON structure
#[derive(Debug, Deserialize)]
struct MarketplaceManifest {
    name: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    owner: Option<ManifestOwner>,
    #[serde(default)]
    plugins: Vec<MarketplacePluginEntry>,
}

#[derive(Debug, Deserialize)]
struct ManifestOwner {
    #[serde(default)]
    name: Option<String>,
}

/// A plugin entry within a marketplace manifest
#[derive(Debug, Deserialize)]
struct MarketplacePluginEntry {
    name: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    version: Option<String>,
    #[serde(default)]
    category: Option<String>,
    #[serde(default)]
    author: Option<MarketplaceAuthor>,
    #[serde(default)]
    homepage: Option<String>,
    #[serde(default)]
    tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct MarketplaceAuthor {
    #[serde(default)]
    name: Option<String>,
}

/// known_marketplaces.json structure
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct KnownMarketplaceEntry {
    install_location: String,
    #[serde(default)]
    last_updated: Option<String>,
}

/// installed_plugins.json structure
#[derive(Debug, Deserialize)]
struct InstalledPluginsFile {
    #[serde(default)]
    plugins: HashMap<String, Vec<InstalledPluginRecord>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InstalledPluginRecord {
    scope: String,
    #[serde(default)]
    project_path: Option<String>,
}

/// install-counts-cache.json structure
#[derive(Debug, Deserialize)]
struct InstallCountsCache {
    #[serde(default)]
    counts: Vec<InstallCountEntry>,
}

#[derive(Debug, Deserialize)]
struct InstallCountEntry {
    plugin: String,
    unique_installs: f64,
}

pub struct MarketplaceService;

impl MarketplaceService {
    fn get_plugins_dir() -> Result<PathBuf> {
        let home = dirs::home_dir().context("Failed to get home directory")?;
        Ok(home.join(".claude").join("plugins"))
    }

    fn read_known_marketplaces() -> Result<HashMap<String, KnownMarketplaceEntry>> {
        let known_path = Self::get_plugins_dir()?.join("known_marketplaces.json");
        Ok(fs::read_to_string(&known_path)
            .ok()
            .and_then(|c| serde_json::from_str(&c).ok())
            .unwrap_or_default())
    }

    /// Read all installed scopes per plugin name.
    fn read_installed_scopes() -> Result<HashMap<String, Vec<PluginInstalledScope>>> {
        let installed_path = Self::get_plugins_dir()?.join("installed_plugins.json");
        let installed: InstalledPluginsFile = fs::read_to_string(&installed_path)
            .ok()
            .and_then(|c| serde_json::from_str(&c).ok())
            .unwrap_or(InstalledPluginsFile {
                plugins: HashMap::new(),
            });

        let mut result: HashMap<String, Vec<PluginInstalledScope>> = HashMap::new();
        for (key, records) in &installed.plugins {
            let plugin_name = key.split('@').next().unwrap_or(key).to_string();
            let scopes = result.entry(plugin_name).or_default();
            for r in records {
                // Deduplicate: skip if we already have this exact scope+path
                let already_exists = scopes.iter().any(|s| {
                    s.scope == r.scope && s.project_path == r.project_path
                });
                if !already_exists {
                    scopes.push(PluginInstalledScope {
                        scope: r.scope.clone(),
                        project_path: r.project_path.clone(),
                    });
                }
            }
        }
        Ok(result)
    }

    /// Read install counts, keyed by plugin name (aggregated across marketplaces).
    fn read_install_counts() -> Result<HashMap<String, f64>> {
        let counts_path = Self::get_plugins_dir()?.join("install-counts-cache.json");
        Ok(fs::read_to_string(&counts_path)
            .ok()
            .and_then(|c| serde_json::from_str::<InstallCountsCache>(&c).ok())
            .map(|cache| {
                let mut map: HashMap<String, f64> = HashMap::new();
                for entry in cache.counts {
                    let name = entry
                        .plugin
                        .split('@')
                        .next()
                        .unwrap_or(&entry.plugin)
                        .to_string();
                    let current = map.entry(name).or_insert(0.0);
                    if entry.unique_installs > *current {
                        *current = entry.unique_installs;
                    }
                }
                map
            })
            .unwrap_or_default())
    }

    fn read_manifest(install_location: &str) -> Option<MarketplaceManifest> {
        let manifest_path = PathBuf::from(install_location)
            .join(".claude-plugin")
            .join("marketplace.json");
        fs::read_to_string(&manifest_path)
            .ok()
            .and_then(|c| serde_json::from_str(&c).ok())
    }

    fn find_claude_binary() -> Result<PathBuf> {
        which::which("claude").context(
            "Claude CLI not found in PATH. Please install Claude Code first.",
        )
    }

    async fn run_claude_command_in_dir(
        args: &[&str],
        cwd: &str,
    ) -> Result<MarketplaceCommandResult> {
        let claude_bin = Self::find_claude_binary()?;

        let output = tokio::process::Command::new(&claude_bin)
            .args(args)
            .current_dir(cwd)
            .output()
            .await
            .context("Failed to execute claude command")?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        if output.status.success() {
            Ok(MarketplaceCommandResult {
                success: true,
                message: if stdout.trim().is_empty() {
                    "Command completed successfully".to_string()
                } else {
                    stdout.trim().to_string()
                },
            })
        } else {
            Ok(MarketplaceCommandResult {
                success: false,
                message: if stderr.trim().is_empty() {
                    stdout.trim().to_string()
                } else {
                    stderr.trim().to_string()
                },
            })
        }
    }

    async fn run_claude_command(args: &[&str]) -> Result<MarketplaceCommandResult> {
        let claude_bin = Self::find_claude_binary()?;

        let output = tokio::process::Command::new(&claude_bin)
            .args(args)
            .output()
            .await
            .context("Failed to execute claude command")?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        if output.status.success() {
            Ok(MarketplaceCommandResult {
                success: true,
                message: if stdout.trim().is_empty() {
                    "Command completed successfully".to_string()
                } else {
                    stdout.trim().to_string()
                },
            })
        } else {
            Ok(MarketplaceCommandResult {
                success: false,
                message: if stderr.trim().is_empty() {
                    stdout.trim().to_string()
                } else {
                    stderr.trim().to_string()
                },
            })
        }
    }

    /// List all plugins available across all configured marketplaces.
    /// Deduplicates plugins that appear in multiple marketplaces.
    /// Returns installed scopes for each plugin across all scopes.
    pub async fn list_plugins() -> Result<Vec<MarketplacePlugin>> {
        let known = Self::read_known_marketplaces()?;
        let installed_scopes_map = Self::read_installed_scopes()?;
        let counts_map = Self::read_install_counts()?;

        let mut result = Vec::new();
        let mut seen_names = std::collections::HashSet::new();

        for entry in known.values() {
            let manifest = match Self::read_manifest(&entry.install_location) {
                Some(m) => m,
                None => continue,
            };

            let marketplace_name = manifest.name.clone();

            for plugin in manifest.plugins {
                if seen_names.contains(&plugin.name) {
                    continue;
                }
                seen_names.insert(plugin.name.clone());

                let installed_scopes = installed_scopes_map
                    .get(&plugin.name)
                    .cloned()
                    .unwrap_or_default();
                let install_count = counts_map.get(&plugin.name).copied();

                result.push(MarketplacePlugin {
                    name: plugin.name,
                    description: plugin.description.unwrap_or_default(),
                    version: plugin.version,
                    category: plugin.category,
                    marketplace_name: marketplace_name.clone(),
                    installed_scopes,
                    install_count,
                    author_name: plugin.author.and_then(|a| a.name),
                    homepage: plugin.homepage,
                    tags: plugin.tags.unwrap_or_default(),
                });
            }
        }

        result.sort_by(|a, b| {
            b.install_count
                .unwrap_or(0.0)
                .partial_cmp(&a.install_count.unwrap_or(0.0))
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        Ok(result)
    }

    /// List configured marketplace sources.
    pub async fn list_marketplaces() -> Result<Vec<MarketplaceInfo>> {
        let known = Self::read_known_marketplaces()?;

        let mut result = Vec::new();

        for entry in known.values() {
            let manifest = Self::read_manifest(&entry.install_location);

            let (name, description, owner_name, plugin_count) = match &manifest {
                Some(m) => (
                    m.name.clone(),
                    m.description.clone().unwrap_or_default(),
                    m.owner.as_ref().and_then(|o| o.name.clone()),
                    m.plugins.len() as f64,
                ),
                None => {
                    // Fallback: derive name from install location
                    let dir_name = PathBuf::from(&entry.install_location)
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default();
                    (dir_name, String::new(), None, 0.0)
                }
            };

            result.push(MarketplaceInfo {
                name,
                description,
                owner_name,
                plugin_count,
                last_updated: entry.last_updated.clone(),
            });
        }

        result.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(result)
    }

    /// Install a plugin from marketplace.
    pub async fn install_plugin(
        name: &str,
        project_path: Option<&str>,
    ) -> Result<MarketplaceCommandResult> {
        match project_path {
            Some(path) => {
                let args = ["plugin", "install", name, "--scope", "project"];
                Self::run_claude_command_in_dir(&args, path).await
            }
            None => {
                let args = ["plugin", "install", name];
                Self::run_claude_command(&args).await
            }
        }
    }

    /// Uninstall a plugin.
    pub async fn uninstall_plugin(
        name: &str,
        project_path: Option<&str>,
    ) -> Result<MarketplaceCommandResult> {
        match project_path {
            Some(path) => {
                let args = ["plugin", "uninstall", name, "--scope", "project"];
                Self::run_claude_command_in_dir(&args, path).await
            }
            None => {
                let args = ["plugin", "uninstall", name];
                Self::run_claude_command(&args).await
            }
        }
    }

    /// Add a marketplace source (URL, path, or GitHub repo).
    pub async fn add_marketplace(source: &str) -> Result<MarketplaceCommandResult> {
        Self::run_claude_command(&["plugin", "marketplace", "add", source]).await
    }

    /// Remove a configured marketplace by name.
    pub async fn remove_marketplace(name: &str) -> Result<MarketplaceCommandResult> {
        Self::run_claude_command(&["plugin", "marketplace", "remove", name]).await
    }

    /// Update all marketplace sources.
    pub async fn update_marketplaces() -> Result<MarketplaceCommandResult> {
        Self::run_claude_command(&["plugin", "marketplace", "update"]).await
    }
}
