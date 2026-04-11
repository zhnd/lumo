//! Claude OAuth credential loader
//!
//! Reads Claude Code's OAuth credentials from file, Keychain, or environment.
//! Includes in-memory cache with 5-minute TTL to avoid repeated Keychain/file reads.

use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Instant;

const KEYCHAIN_SERVICE: &str = "Claude Code-credentials";
const CREDENTIALS_FILE: &str = ".claude/.credentials.json";
const ENV_TOKEN: &str = "CLAUDE_CODE_OAUTH_TOKEN";

/// Cache TTL: 5 minutes. Forces reload from file to detect external changes.
const CACHE_TTL_SECS: u64 = 5 * 60;

/// Full OAuth credentials from Claude Code.
#[derive(Debug, Clone)]
pub struct ClaudeCredentials {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: Option<f64>, // milliseconds since epoch
    pub subscription_type: Option<String>,
    pub source: CredentialSource,
    /// Raw JSON data for persisting updates back to the source.
    pub full_data: serde_json::Value,
    /// macOS Keychain account name (preserved for writes to avoid creating duplicate entries).
    pub keychain_account: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum CredentialSource {
    File,
    Keychain,
    Environment,
}

// --- In-memory cache ---

struct CacheEntry {
    credentials: ClaudeCredentials,
    cached_at: Instant,
}

static CACHE: Mutex<Option<CacheEntry>> = Mutex::new(None);

fn cache_get() -> Option<ClaudeCredentials> {
    let lock = CACHE.lock().ok()?;
    let entry = lock.as_ref()?;
    if entry.cached_at.elapsed().as_secs() > CACHE_TTL_SECS {
        return None;
    }
    Some(entry.credentials.clone())
}

fn cache_set(creds: &ClaudeCredentials) {
    if let Ok(mut lock) = CACHE.lock() {
        *lock = Some(CacheEntry {
            credentials: creds.clone(),
            cached_at: Instant::now(),
        });
    }
}

/// Clear the credential cache. Call this after auth failures so next
/// load re-reads from file/keychain (Claude Code may have refreshed externally).
pub fn clear_cache() {
    if let Ok(mut lock) = CACHE.lock() {
        *lock = None;
    }
}

/// Load Claude OAuth credentials from cache or available sources.
///
/// Priority: cache → file → keychain → environment variable.
pub fn load_credentials() -> Option<ClaudeCredentials> {
    // Check cache first
    if let Some(cached) = cache_get() {
        log::debug!("Loaded Claude credentials from cache");
        return Some(cached);
    }

    let creds = load_from_file()
        .or_else(load_from_keychain)
        .or_else(load_from_env);

    if let Some(ref c) = creds {
        cache_set(c);
    } else {
        log::warn!(
            "No Claude credentials found (checked file, keychain, env var '{}')",
            ENV_TOKEN
        );
    }

    creds
}

/// Force-reload credentials from file/keychain, bypassing cache.
pub fn reload_credentials() -> Option<ClaudeCredentials> {
    clear_cache();
    let creds = load_from_file()
        .or_else(load_from_keychain)
        .or_else(load_from_env);

    if let Some(ref c) = creds {
        cache_set(c);
    }

    creds
}

/// Save updated credentials back to the original source and update cache.
pub fn save_credentials(creds: &ClaudeCredentials) {
    match creds.source {
        CredentialSource::File => save_to_file(creds),
        CredentialSource::Keychain => save_to_keychain(creds),
        CredentialSource::Environment => {}
    }
    cache_set(creds);
}

// --- Extract credentials from JSON ---

fn extract_credentials(
    json: &serde_json::Value,
    source: CredentialSource,
    keychain_account: Option<String>,
) -> Option<ClaudeCredentials> {
    let oauth = json.get("claudeAiOauth")?;

    let access_token = oauth
        .get("accessToken")?
        .as_str()?
        .trim()
        .to_string();

    if access_token.is_empty() {
        return None;
    }

    let refresh_token = oauth
        .get("refreshToken")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let expires_at = oauth.get("expiresAt").and_then(|v| v.as_f64());

    let subscription_type = oauth
        .get("subscriptionType")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    Some(ClaudeCredentials {
        access_token,
        refresh_token,
        expires_at,
        subscription_type,
        source,
        full_data: json.clone(),
        keychain_account,
    })
}

// --- Source loaders ---

fn load_from_file() -> Option<ClaudeCredentials> {
    let home = dirs::home_dir()?;
    let path: PathBuf = home.join(CREDENTIALS_FILE);

    let data = match std::fs::read_to_string(&path) {
        Ok(d) => d,
        Err(e) => {
            log::debug!("Credentials file not found at {}: {}", path.display(), e);
            return None;
        }
    };

    let json: serde_json::Value = match serde_json::from_str(&data) {
        Ok(v) => v,
        Err(e) => {
            log::warn!(
                "Failed to parse credentials file {}: {}",
                path.display(),
                e
            );
            return None;
        }
    };

    let creds = extract_credentials(&json, CredentialSource::File, None);
    if creds.is_some() {
        log::debug!("Loaded Claude credentials from file");
    } else {
        log::warn!("Credentials file exists but missing accessToken");
    }
    creds
}

#[cfg(target_os = "macos")]
fn load_from_keychain() -> Option<ClaudeCredentials> {
    // Try native API first (fast, triggers proper auth dialog), then CLI fallback
    // (service-only search, compatible with any account name).
    load_from_keychain_native().or_else(load_from_keychain_cli)
}

/// Native Keychain API: requires exact service + account match.
#[cfg(target_os = "macos")]
fn load_from_keychain_native() -> Option<ClaudeCredentials> {
    let username = dirs::home_dir()
        .and_then(|h| h.file_name().map(|n| n.to_string_lossy().into_owned()))?;

    let password_bytes =
        match security_framework::passwords::get_generic_password(KEYCHAIN_SERVICE, &username) {
            Ok(bytes) => bytes,
            Err(e) => {
                log::debug!(
                    "Keychain native lookup failed for service='{}' account='{}': {}",
                    KEYCHAIN_SERVICE,
                    username,
                    e
                );
                return None;
            }
        };

    parse_keychain_bytes(password_bytes, "Keychain (native)", Some(username))
}

/// CLI fallback: searches by service name only, matches any account.
/// Handles cases where the keychain entry's account differs from the local username.
#[cfg(target_os = "macos")]
fn load_from_keychain_cli() -> Option<ClaudeCredentials> {
    // First, discover the actual account name for this service entry.
    let acct_output = std::process::Command::new("security")
        .args(["find-generic-password", "-s", KEYCHAIN_SERVICE])
        .output()
        .ok()?;

    let acct_name = if acct_output.status.success() {
        let stderr = String::from_utf8_lossy(&acct_output.stdout);
        // Parse "acct"<blob>="username" from output
        stderr
            .lines()
            .find(|l| l.contains("\"acct\""))
            .and_then(|l| l.split('=').nth(1))
            .map(|s| s.trim().trim_matches('"').to_string())
    } else {
        None
    };

    // Now get the password
    let output = std::process::Command::new("security")
        .args(["find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"])
        .output()
        .ok()?;

    if !output.status.success() {
        log::debug!("Keychain CLI lookup failed (exit {})", output.status);
        return None;
    }

    let raw = String::from_utf8(output.stdout).ok()?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }

    parse_keychain_bytes(trimmed.as_bytes().to_vec(), "Keychain (CLI)", acct_name)
}

/// Shared parser for keychain data (used by both native and CLI paths).
#[cfg(target_os = "macos")]
fn parse_keychain_bytes(
    bytes: Vec<u8>,
    source_label: &str,
    keychain_account: Option<String>,
) -> Option<ClaudeCredentials> {
    let json_str = match String::from_utf8(bytes) {
        Ok(s) => s,
        Err(e) => {
            log::warn!("{} value is not valid UTF-8: {}", source_label, e);
            return None;
        }
    };

    let json: serde_json::Value = match serde_json::from_str(json_str.trim()) {
        Ok(v) => v,
        Err(e) => {
            log::warn!("{} value is not valid JSON: {}", source_label, e);
            return None;
        }
    };

    let creds = extract_credentials(&json, CredentialSource::Keychain, keychain_account);
    if creds.is_some() {
        log::debug!("Loaded Claude credentials from {}", source_label);
    } else {
        log::warn!("{} entry exists but missing accessToken", source_label);
    }
    creds
}

#[cfg(not(target_os = "macos"))]
fn load_from_keychain() -> Option<ClaudeCredentials> {
    None
}

fn load_from_env() -> Option<ClaudeCredentials> {
    let token = std::env::var(ENV_TOKEN).ok()?.trim().to_string();

    if token.is_empty() {
        return None;
    }

    log::debug!("Loaded Claude credentials from environment");
    Some(ClaudeCredentials {
        access_token: token,
        refresh_token: None,
        expires_at: None,
        subscription_type: None,
        source: CredentialSource::Environment,
        full_data: serde_json::Value::Object(serde_json::Map::new()),
        keychain_account: None,
    })
}

// --- Save helpers ---

fn build_updated_json(creds: &ClaudeCredentials) -> serde_json::Value {
    let mut data = creds.full_data.clone();
    let oauth = data
        .as_object_mut()
        .and_then(|obj| obj.get_mut("claudeAiOauth"))
        .and_then(|v| v.as_object_mut());

    if let Some(oauth) = oauth {
        oauth.insert(
            "accessToken".to_string(),
            serde_json::Value::String(creds.access_token.clone()),
        );
        if let Some(ref rt) = creds.refresh_token {
            oauth.insert(
                "refreshToken".to_string(),
                serde_json::Value::String(rt.clone()),
            );
        }
        if let Some(exp) = creds.expires_at {
            oauth.insert("expiresAt".to_string(), serde_json::json!(exp));
        }
    }

    data
}

fn save_to_file(creds: &ClaudeCredentials) {
    let Some(home) = dirs::home_dir() else {
        return;
    };
    let path = home.join(CREDENTIALS_FILE);
    let data = build_updated_json(creds);

    match serde_json::to_string_pretty(&data) {
        Ok(json_str) => {
            if let Err(e) = std::fs::write(&path, json_str) {
                log::warn!("Failed to save credentials to file: {}", e);
            } else {
                log::debug!("Saved updated credentials to file");
            }
        }
        Err(e) => log::warn!("Failed to serialize credentials: {}", e),
    }
}

#[cfg(target_os = "macos")]
fn save_to_keychain(creds: &ClaudeCredentials) {
    // Use the original account name from when we loaded the entry,
    // falling back to the local username if unknown.
    let account = creds
        .keychain_account
        .clone()
        .or_else(|| {
            dirs::home_dir()
                .and_then(|h| h.file_name().map(|n| n.to_string_lossy().into_owned()))
        });

    let Some(account) = account else { return };

    let data = build_updated_json(creds);
    let json_str = match serde_json::to_string(&data) {
        Ok(s) => s,
        Err(e) => {
            log::warn!("Failed to serialize credentials for keychain: {}", e);
            return;
        }
    };

    if let Err(e) = security_framework::passwords::set_generic_password(
        KEYCHAIN_SERVICE,
        &account,
        json_str.as_bytes(),
    ) {
        log::warn!("Failed to save credentials to keychain: {}", e);
    } else {
        log::debug!("Saved updated credentials to keychain");
    }
}

#[cfg(not(target_os = "macos"))]
fn save_to_keychain(_creds: &ClaudeCredentials) {}
