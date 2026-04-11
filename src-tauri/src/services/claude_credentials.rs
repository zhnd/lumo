//! Claude OAuth credential loader
//!
//! Reads Claude Code's OAuth access token from Keychain, file, or environment.
//! Does NOT implement token refresh — Claude Code handles that itself.

use std::path::PathBuf;

const KEYCHAIN_SERVICE: &str = "Claude Code-credentials";
const CREDENTIALS_FILE: &str = ".claude/.credentials.json";
const ENV_TOKEN: &str = "CLAUDE_CODE_OAUTH_TOKEN";

/// Load the Claude OAuth access token from available sources.
///
/// Priority:
/// 1. File: `~/.claude/.credentials.json`
/// 2. macOS Keychain: service "Claude Code-credentials"
/// 3. Environment variable: `CLAUDE_CODE_OAUTH_TOKEN`
pub fn load_access_token() -> Option<String> {
    load_from_file()
        .or_else(load_from_keychain)
        .or_else(load_from_env)
}

fn load_from_file() -> Option<String> {
    let home = dirs::home_dir()?;
    let path: PathBuf = home.join(CREDENTIALS_FILE);

    let data = std::fs::read_to_string(&path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&data).ok()?;

    let token = json
        .get("claudeAiOauth")?
        .get("accessToken")?
        .as_str()?
        .trim()
        .to_string();

    if token.is_empty() {
        return None;
    }

    log::debug!("Loaded Claude credentials from file");
    Some(token)
}

fn load_from_keychain() -> Option<String> {
    let output = std::process::Command::new("security")
        .args(["find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let json_str = String::from_utf8(output.stdout).ok()?.trim().to_string();
    if json_str.is_empty() {
        return None;
    }

    let json: serde_json::Value = serde_json::from_str(&json_str).ok()?;

    let token = json
        .get("claudeAiOauth")?
        .get("accessToken")?
        .as_str()?
        .trim()
        .to_string();

    if token.is_empty() {
        return None;
    }

    log::debug!("Loaded Claude credentials from Keychain");
    Some(token)
}

fn load_from_env() -> Option<String> {
    let token = std::env::var(ENV_TOKEN).ok()?.trim().to_string();

    if token.is_empty() {
        return None;
    }

    log::debug!("Loaded Claude credentials from environment");
    Some(token)
}
