//! Config service
//!
//! Manages persistent configuration stored in ~/.lumo/config.json.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Config {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub anthropic_api_key: Option<String>,
}

pub struct ConfigService;

impl ConfigService {
    fn config_path() -> Result<PathBuf> {
        let home = dirs::home_dir().context("Could not find home directory")?;
        Ok(home.join(".lumo").join("config.json"))
    }

    fn read_config() -> Result<Config> {
        let path = Self::config_path()?;
        if !path.exists() {
            return Ok(Config::default());
        }
        let content = fs::read_to_string(&path).context("Failed to read config file")?;
        let config: Config =
            serde_json::from_str(&content).context("Failed to parse config file")?;
        Ok(config)
    }

    fn write_config(config: &Config) -> Result<()> {
        let path = Self::config_path()?;
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).context("Failed to create config directory")?;
        }
        let content =
            serde_json::to_string_pretty(config).context("Failed to serialize config")?;
        fs::write(&path, content).context("Failed to write config file")?;
        Ok(())
    }

    pub fn save_api_key(api_key: &str) -> Result<()> {
        let mut config = Self::read_config()?;
        config.anthropic_api_key = Some(api_key.to_string());
        Self::write_config(&config)
    }

    pub fn get_api_key() -> Result<Option<String>> {
        let config = Self::read_config()?;
        Ok(config.anthropic_api_key)
    }

    pub fn has_api_key() -> bool {
        Self::get_api_key()
            .map(|k| k.is_some())
            .unwrap_or(false)
    }

    pub fn delete_api_key() -> Result<()> {
        let mut config = Self::read_config()?;
        config.anthropic_api_key = None;
        Self::write_config(&config)
    }
}
