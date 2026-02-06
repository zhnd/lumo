//! Claude Code configuration service
//!
//! Manages `~/.claude/settings.json` to configure OTEL telemetry export
//! pointing at the Lumo daemon, and hooks for notification forwarding.

use anyhow::{Context, Result};
use serde_json::{json, Map, Value};
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

/// The command used by Lumo hooks — pipes hook stdin JSON to the daemon.
/// Uses --noproxy to bypass any system proxy (e.g. SOCKS5) for localhost.
const HOOK_COMMAND: &str =
    "curl -s --noproxy localhost -X POST http://localhost:4318/notify -H 'Content-Type: application/json' -d \"$(cat)\"";

/// Marker substring to detect if a Lumo hook is already present.
const HOOK_MARKER: &str = "localhost:4318/notify";

/// Hook events that Lumo subscribes to.
/// We omit matchers entirely so they fire on every occurrence of the event.
const HOOK_EVENTS: &[&str] = &["Notification", "Stop", "SubagentStop"];

pub struct ClaudeConfigService;

impl ClaudeConfigService {
    fn settings_path() -> Result<PathBuf> {
        let home = dirs::home_dir().context("Could not find home directory")?;
        Ok(home.join(".claude").join("settings.json"))
    }

    fn read_settings(path: &PathBuf) -> Result<Map<String, Value>> {
        if path.exists() {
            let content = fs::read_to_string(path).context("Failed to read Claude settings")?;
            serde_json::from_str(&content).context("Failed to parse Claude settings")
        } else {
            Ok(Map::new())
        }
    }

    fn write_settings(path: &PathBuf, root: &Map<String, Value>) -> Result<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).context("Failed to create ~/.claude directory")?;
        }
        let content =
            serde_json::to_string_pretty(root).context("Failed to serialize Claude settings")?;
        fs::write(path, content).context("Failed to write Claude settings")?;
        Ok(())
    }

    /// Ensure Claude Code's settings.json has the required OTEL env vars.
    /// Preserves all existing settings — only adds/updates the OTEL keys.
    pub fn ensure_otel_config() -> Result<()> {
        let path = Self::settings_path()?;
        let mut root = Self::read_settings(&path)?;

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

        Self::write_settings(&path, &root)?;
        log::info!("Updated Claude Code OTEL config at {}", path.display());
        Ok(())
    }

    /// Check if a JSON value (at any nesting level) contains the Lumo hook marker.
    fn contains_hook_marker(value: &Value) -> bool {
        match value {
            Value::String(s) => s.contains(HOOK_MARKER),
            Value::Array(arr) => arr.iter().any(Self::contains_hook_marker),
            Value::Object(map) => map.values().any(Self::contains_hook_marker),
            _ => false,
        }
    }

    /// Ensure Claude Code's settings.json has hooks that forward events
    /// to the Lumo daemon's `/notify` endpoint.
    ///
    /// Claude Code hooks use a three-level structure:
    /// ```json
    /// { "hooks": { "EventName": [ { "hooks": [ { "type": "command", "command": "..." } ] } ] } }
    /// ```
    /// - Level 1: event name → array of matcher groups
    /// - Level 2: each matcher group has optional `matcher` + `hooks` array
    /// - Level 3: each hook handler has `type`, `command`, etc.
    ///
    /// This method cleans up any old-format (flat) Lumo entries before
    /// writing the correct nested format.
    pub fn ensure_hooks_config() -> Result<()> {
        let path = Self::settings_path()?;
        let mut root = Self::read_settings(&path)?;

        let hooks_obj = root
            .entry("hooks")
            .or_insert_with(|| Value::Object(Map::new()));
        let hooks_map = hooks_obj
            .as_object_mut()
            .context("'hooks' field in Claude settings is not an object")?;

        let expected_hook = json!({
            "hooks": [
                {
                    "type": "command",
                    "command": HOOK_COMMAND,
                }
            ]
        });

        let mut changed = false;

        for &event_name in HOOK_EVENTS {
            let event_arr = hooks_map
                .entry(event_name)
                .or_insert_with(|| Value::Array(Vec::new()));
            let arr = event_arr
                .as_array_mut()
                .context(format!("hooks.{} is not an array", event_name))?;

            // Check if the correct entry already exists
            if arr.contains(&expected_hook) {
                continue;
            }

            // Remove any old-format or malformed Lumo entries
            arr.retain(|entry| !Self::contains_hook_marker(entry));

            // Add the correctly structured matcher group
            arr.push(expected_hook.clone());
            changed = true;
        }

        if !changed {
            log::info!("Claude Code hooks config already up to date");
            return Ok(());
        }

        Self::write_settings(&path, &root)?;
        log::info!("Updated Claude Code hooks config at {}", path.display());
        Ok(())
    }
}
