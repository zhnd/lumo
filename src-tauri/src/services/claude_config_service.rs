//! Claude Code configuration service
//!
//! Manages `~/.claude/settings.json` to configure OTEL telemetry export
//! pointing at the Lumo daemon.

use anyhow::{Context, Result};
use serde_json::{Map, Value};
use std::fs;
use std::path::PathBuf;

/// Environment variables that Lumo manages in Claude Code settings.
const OTEL_ENV_VARS: &[(&str, &str)] = &[
    ("CLAUDE_CODE_ENABLE_TELEMETRY", "1"),
    ("OTEL_METRICS_EXPORTER", "otlp"),
    ("OTEL_LOGS_EXPORTER", "otlp"),
    ("OTEL_EXPORTER_OTLP_PROTOCOL", "http/json"),
    ("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318"),
];

pub struct ClaudeConfigService;

impl ClaudeConfigService {
    fn settings_path() -> Result<PathBuf> {
        let home = dirs::home_dir().context("Could not find home directory")?;
        Ok(home.join(".claude").join("settings.json"))
    }

    /// Ensure Claude Code's settings.json has the required OTEL env vars.
    /// Preserves all existing settings — only adds/updates the OTEL keys.
    pub fn ensure_otel_config() -> Result<()> {
        let path = Self::settings_path()?;

        let mut root: Map<String, Value> = if path.exists() {
            let content = fs::read_to_string(&path).context("Failed to read Claude settings")?;
            serde_json::from_str(&content).context("Failed to parse Claude settings")?
        } else {
            Map::new()
        };

        let env_obj = root
            .entry("env")
            .or_insert_with(|| Value::Object(Map::new()));

        let env_map = env_obj
            .as_object_mut()
            .context("'env' field in Claude settings is not an object")?;

        let mut changed = false;
        for &(key, value) in OTEL_ENV_VARS {
            let expected = Value::String(value.to_string());
            if env_map.get(key) != Some(&expected) {
                env_map.insert(key.to_string(), expected);
                changed = true;
            }
        }

        if !changed {
            log::info!("Claude Code OTEL config already up to date");
            return Ok(());
        }

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).context("Failed to create ~/.claude directory")?;
        }

        let content = serde_json::to_string_pretty(&root)
            .context("Failed to serialize Claude settings")?;
        fs::write(&path, content).context("Failed to write Claude settings")?;

        log::info!("Updated Claude Code OTEL config at {}", path.display());
        Ok(())
    }
}
