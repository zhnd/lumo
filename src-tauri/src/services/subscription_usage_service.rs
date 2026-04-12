//! Subscription usage service
//!
//! Fetches Claude Pro/Max subscription usage via:
//! 1. OAuth API (primary) with automatic token refresh
//! 2. CLI fallback (`claude /usage`) if API fails

use anyhow::{Context, Result};

use super::claude_credentials::{self, ClaudeCredentials};
use crate::types::{SubscriptionUsageResponse, SubscriptionUsageResult};

const USAGE_URL: &str = "https://api.anthropic.com/api/oauth/usage";
const REFRESH_URL: &str = "https://platform.claude.com/v1/oauth/token";
const CLIENT_ID: &str = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const SCOPES: &str = "user:profile user:inference user:sessions:claude_code";

/// 5-minute buffer before expiry to trigger refresh (in milliseconds).
const REFRESH_BUFFER_MS: f64 = 5.0 * 60.0 * 1000.0;

// --- API response structures ---

#[derive(serde::Deserialize)]
struct ApiUsageBucket {
    utilization: Option<f64>,
    resets_at: Option<String>,
}

#[derive(serde::Deserialize)]
struct ApiExtraUsage {
    is_enabled: bool,
    utilization: Option<f64>,
    used_credits: Option<f64>,
    monthly_limit: Option<f64>,
}

#[derive(serde::Deserialize)]
struct ApiUsageResponse {
    five_hour: Option<ApiUsageBucket>,
    seven_day: Option<ApiUsageBucket>,
    seven_day_opus: Option<ApiUsageBucket>,
    seven_day_sonnet: Option<ApiUsageBucket>,
    extra_usage: Option<ApiExtraUsage>,
}

#[derive(serde::Deserialize)]
struct TokenRefreshResponse {
    access_token: Option<String>,
    refresh_token: Option<String>,
    expires_in: Option<i64>,
}

/// Internal error type to distinguish auth failures from other errors.
enum AuthOrError {
    NeedsAuth,
    Other(anyhow::Error),
}

pub struct SubscriptionUsageService;

impl SubscriptionUsageService {
    pub async fn fetch_usage() -> Result<SubscriptionUsageResult> {
        // Derive subscription badge once — applies to all result paths (API + CLI).
        let subscription_badge = claude_credentials::load_credentials()
            .as_ref()
            .and_then(Self::parse_subscription_badge);

        let mut result = match Self::fetch_via_api().await {
            Ok(r) if !r.needs_login => r,
            Ok(api_result) => {
                // needs_login from API — try CLI fallback before giving up
                log::debug!("API probe requires login, trying CLI fallback...");
                match Self::fetch_via_cli().await {
                    Ok(cli_result) => cli_result,
                    Err(e) => {
                        log::debug!("CLI fallback also failed: {}", e);
                        api_result
                    }
                }
            }
            Err(api_err) => {
                // API error — try CLI fallback
                log::warn!("API probe failed: {}, trying CLI fallback...", api_err);
                match Self::fetch_via_cli().await {
                    Ok(cli_result) => cli_result,
                    Err(cli_err) => {
                        log::warn!("CLI fallback also failed: {}", cli_err);
                        return Err(api_err);
                    }
                }
            }
        };

        // Ensure subscription badge is present on all paths
        if result.subscription_type.is_none() {
            result.subscription_type = subscription_badge;
        }

        Ok(result)
    }

    // ---------------------------------------------------------------
    // API probe
    // ---------------------------------------------------------------

    async fn fetch_via_api() -> Result<SubscriptionUsageResult> {
        let mut creds = match claude_credentials::load_credentials() {
            Some(c) => c,
            None => {
                return Ok(Self::login_result(None));
            }
        };

        let subscription_badge = Self::parse_subscription_badge(&creds);

        // Refresh token if expired or about to expire
        if Self::needs_refresh(&creds) {
            match Self::refresh_token(&creds).await {
                Ok(refreshed) => creds = refreshed,
                Err(e) => {
                    log::warn!("Token refresh failed: {}", e);
                    // Try reloading from file — CLI may have refreshed externally
                    claude_credentials::clear_cache();
                    if let Some(fresh) = claude_credentials::reload_credentials() {
                        if fresh.access_token != creds.access_token {
                            log::debug!(
                                "Found updated credentials from file/keychain, retrying..."
                            );
                            creds = fresh;
                            // If fresh creds also expired, try refreshing once more
                            if Self::needs_refresh(&creds) {
                                match Self::refresh_token(&creds).await {
                                    Ok(refreshed) => creds = refreshed,
                                    Err(e2) => {
                                        log::warn!("Retry refresh also failed: {}", e2);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Fetch usage data
        let client = reqwest::Client::new();
        match Self::call_usage_api(&client, &creds.access_token).await {
            Ok(mut result) => {
                result.subscription_type = subscription_badge;
                Ok(result)
            }
            Err(AuthOrError::NeedsAuth) => {
                // Token rejected — try refreshing once if we have a refresh token
                if creds.refresh_token.is_some() {
                    log::debug!("Usage API returned 401/403, attempting token refresh...");
                    claude_credentials::clear_cache();

                    // First try reloading from file (CLI may have refreshed)
                    if let Some(fresh) = claude_credentials::reload_credentials() {
                        if fresh.access_token != creds.access_token {
                            log::debug!("Found externally updated credentials, retrying...");
                            if let Ok(mut r) = Self::call_usage_api(&client, &fresh.access_token).await {
                                r.subscription_type = subscription_badge;
                                return Ok(r);
                            }
                        }
                    }

                    // Then try refreshing
                    match Self::refresh_token(&creds).await {
                        Ok(refreshed) => {
                            match Self::call_usage_api(&client, &refreshed.access_token).await {
                                Ok(mut r) => {
                                    r.subscription_type = subscription_badge;
                                    Ok(r)
                                }
                                Err(AuthOrError::NeedsAuth) => Ok(Self::login_result(subscription_badge)),
                                Err(AuthOrError::Other(e)) => Err(e),
                            }
                        }
                        Err(e) => {
                            log::warn!("Token refresh after 401/403 failed: {}", e);
                            Ok(Self::login_result(subscription_badge))
                        }
                    }
                } else {
                    Ok(Self::login_result(subscription_badge))
                }
            }
            Err(AuthOrError::Other(e)) => Err(e),
        }
    }

    fn login_result(subscription_type: Option<String>) -> SubscriptionUsageResult {
        SubscriptionUsageResult {
            needs_login: true,
            usage: None,
            error: None,
            subscription_type,
        }
    }

    fn parse_subscription_badge(creds: &ClaudeCredentials) -> Option<String> {
        let raw = creds.subscription_type.as_deref()?;
        let badge = match raw.to_lowercase().as_str() {
            "claude_max" | "max" => "MAX",
            "claude_pro" | "pro" => "PRO",
            "api" | "claude_api" => "API",
            _ => raw,
        };
        Some(badge.to_string())
    }

    fn needs_refresh(creds: &ClaudeCredentials) -> bool {
        match creds.expires_at {
            Some(expires_at) => {
                let now_ms = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs_f64()
                    * 1000.0;
                now_ms + REFRESH_BUFFER_MS >= expires_at
            }
            // No expiry info — assume refresh needed if we have a refresh token
            None => creds.refresh_token.is_some(),
        }
    }

    async fn refresh_token(creds: &ClaudeCredentials) -> Result<ClaudeCredentials> {
        let refresh_token = creds
            .refresh_token
            .as_ref()
            .context("No refresh token available")?;

        log::debug!("Refreshing Claude OAuth token...");

        let body = serde_json::json!({
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": CLIENT_ID,
            "scope": SCOPES,
        });

        let client = reqwest::Client::new();
        let response = client
            .post(REFRESH_URL)
            .header("Content-Type", "application/json")
            .json(&body)
            .timeout(std::time::Duration::from_secs(15))
            .send()
            .await
            .context("Failed to connect to token refresh endpoint")?;

        let status = response.status();
        if !status.is_success() {
            let body_text = response.text().await.unwrap_or_default();
            log::warn!(
                "Token refresh failed with HTTP {}: {}",
                status.as_u16(),
                body_text
            );
            anyhow::bail!("Token refresh failed: HTTP {}", status.as_u16());
        }

        let refresh_resp: TokenRefreshResponse = response
            .json()
            .await
            .context("Failed to parse token refresh response")?;

        let new_access_token = refresh_resp
            .access_token
            .filter(|s| !s.is_empty())
            .context("No access token in refresh response")?;

        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs_f64()
            * 1000.0;

        let mut updated = creds.clone();
        updated.access_token = new_access_token;
        if let Some(new_rt) = refresh_resp.refresh_token.filter(|s| !s.is_empty()) {
            updated.refresh_token = Some(new_rt);
        }
        if let Some(expires_in) = refresh_resp.expires_in {
            updated.expires_at = Some(now_ms + (expires_in as f64) * 1000.0);
        }

        claude_credentials::save_credentials(&updated);
        log::debug!("Claude OAuth token refreshed successfully");
        Ok(updated)
    }

    async fn call_usage_api(
        client: &reqwest::Client,
        access_token: &str,
    ) -> std::result::Result<SubscriptionUsageResult, AuthOrError> {
        let response = client
            .get(USAGE_URL)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("anthropic-beta", "oauth-2025-04-20")
            .header("Accept", "application/json")
            .timeout(std::time::Duration::from_secs(15))
            .send()
            .await
            .map_err(|e| AuthOrError::Other(e.into()))?;

        let status = response.status();

        if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
            let body = response.text().await.unwrap_or_default();
            log::warn!("Usage API returned {} — body: {}", status.as_u16(), body);
            return Err(AuthOrError::NeedsAuth);
        }

        if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            let retry_after = response
                .headers()
                .get("retry-after")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("60");
            return Ok(SubscriptionUsageResult {
                needs_login: false,
                usage: None,
                error: Some(format!(
                    "Rate limited. Please wait {} seconds before retrying.",
                    retry_after
                )),
                subscription_type: None,
            });
        }

        if !status.is_success() {
            return Ok(SubscriptionUsageResult {
                needs_login: false,
                usage: None,
                error: Some(format!("API returned HTTP {}", status.as_u16())),
                subscription_type: None,
            });
        }

        let api_response: ApiUsageResponse = match response.json().await {
            Ok(parsed) => parsed,
            Err(e) => {
                return Ok(SubscriptionUsageResult {
                    needs_login: false,
                    usage: None,
                    error: Some(format!("Failed to parse usage response: {}", e)),
                    subscription_type: None,
                });
            }
        };

        Ok(SubscriptionUsageResult {
            needs_login: false,
            usage: Some(Self::convert_response(api_response)),
            error: None,
            subscription_type: None, // filled in by caller
        })
    }

    // ---------------------------------------------------------------
    // CLI fallback
    // ---------------------------------------------------------------

    async fn fetch_via_cli() -> Result<SubscriptionUsageResult> {
        let claude_path = which::which("claude")
            .context("Claude CLI binary not found in PATH")?;

        log::debug!("CLI fallback: using {}", claude_path.display());

        // Strip CLAUDE_CODE_OAUTH_TOKEN from env to force stored credentials
        // (setup-tokens only have inference scope, not usage scope)
        let env_vars: Vec<(String, String)> = std::env::vars()
            .filter(|(k, _)| k != "CLAUDE_CODE_OAUTH_TOKEN")
            .collect();

        let output = tokio::process::Command::new(&claude_path)
            .args(["/usage", "--output", "json", "--allowed-tools", ""])
            .env_clear()
            .envs(env_vars)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .output()
            .await
            .context("Failed to execute claude /usage")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            anyhow::bail!("claude /usage failed (exit {}): {}", output.status, stderr);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);

        // Try parsing as JSON first (--output json may work)
        if let Ok(api_resp) = serde_json::from_str::<ApiUsageResponse>(&stdout) {
            return Ok(SubscriptionUsageResult {
                needs_login: false,
                usage: Some(Self::convert_response(api_resp)),
                error: None,
                subscription_type: None,
            });
        }

        // Try parsing as text output (fallback)
        match Self::parse_cli_text_output(&stdout) {
            Some(usage) => Ok(SubscriptionUsageResult {
                needs_login: false,
                usage: Some(usage),
                error: None,
                subscription_type: None,
            }),
            None => {
                log::warn!("CLI fallback: could not parse output: {}", &stdout[..stdout.len().min(500)]);
                anyhow::bail!("Failed to parse claude /usage output")
            }
        }
    }

    /// Best-effort parser for `claude /usage` text output.
    /// Looks for percentage patterns like "45.2% used" or "45%" and reset times.
    fn parse_cli_text_output(text: &str) -> Option<SubscriptionUsageResponse> {
        use crate::types::{ExtraUsage, UsageBucket};

        // Strip ANSI escape codes
        let clean = strip_ansi(text);
        let lines: Vec<&str> = clean.lines().collect();

        let mut five_hour: Option<UsageBucket> = None;
        let mut seven_day: Option<UsageBucket> = None;
        let mut seven_day_opus: Option<UsageBucket> = None;
        let mut seven_day_sonnet: Option<UsageBucket> = None;
        let mut extra_usage: Option<ExtraUsage> = None;

        let mut i = 0;
        while i < lines.len() {
            let line = lines[i].trim().to_lowercase();

            if line.contains("session") && line.contains("limit") || line.contains("5-hour") || line.contains("five") {
                if let Some((util, resets)) = find_usage_in_nearby_lines(&lines, i) {
                    five_hour = Some(UsageBucket { utilization: Some(util), resets_at: resets });
                }
            } else if line.contains("opus") {
                if let Some((util, resets)) = find_usage_in_nearby_lines(&lines, i) {
                    seven_day_opus = Some(UsageBucket { utilization: Some(util), resets_at: resets });
                }
            } else if line.contains("sonnet") {
                if let Some((util, resets)) = find_usage_in_nearby_lines(&lines, i) {
                    seven_day_sonnet = Some(UsageBucket { utilization: Some(util), resets_at: resets });
                }
            } else if (line.contains("weekly") || line.contains("7-day") || line.contains("seven"))
                && !line.contains("opus") && !line.contains("sonnet")
            {
                if let Some((util, resets)) = find_usage_in_nearby_lines(&lines, i) {
                    seven_day = Some(UsageBucket { utilization: Some(util), resets_at: resets });
                }
            } else if line.contains("extra") || line.contains("overage") || line.contains("pay") {
                if let Some((util, _)) = find_usage_in_nearby_lines(&lines, i) {
                    extra_usage = Some(ExtraUsage {
                        is_enabled: true,
                        utilization: Some(util),
                        used_credits: None,
                        monthly_limit: None,
                    });
                }
            }

            i += 1;
        }

        // Only return if we found at least one bucket
        if five_hour.is_some() || seven_day.is_some() || seven_day_opus.is_some() || seven_day_sonnet.is_some() {
            Some(SubscriptionUsageResponse {
                five_hour,
                seven_day,
                seven_day_opus,
                seven_day_sonnet,
                extra_usage,
            })
        } else {
            None
        }
    }

    // ---------------------------------------------------------------
    // Response conversion
    // ---------------------------------------------------------------

    fn convert_response(api: ApiUsageResponse) -> SubscriptionUsageResponse {
        use crate::types::{ExtraUsage, UsageBucket};

        let convert_bucket = |b: ApiUsageBucket| UsageBucket {
            utilization: b.utilization,
            resets_at: b.resets_at,
        };

        SubscriptionUsageResponse {
            five_hour: api.five_hour.map(convert_bucket),
            seven_day: api.seven_day.map(convert_bucket),
            seven_day_opus: api.seven_day_opus.map(convert_bucket),
            seven_day_sonnet: api.seven_day_sonnet.map(convert_bucket),
            extra_usage: api.extra_usage.map(|e| ExtraUsage {
                is_enabled: e.is_enabled,
                utilization: e.utilization,
                used_credits: e.used_credits,
                monthly_limit: e.monthly_limit,
            }),
        }
    }
}

// --- Helpers ---

/// Strip ANSI escape codes from text.
fn strip_ansi(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut chars = text.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '\x1b' {
            // Skip until we find the terminating letter
            if chars.peek() == Some(&'[') {
                chars.next();
                while let Some(&c) = chars.peek() {
                    chars.next();
                    if c.is_ascii_alphabetic() {
                        break;
                    }
                }
            }
        } else {
            result.push(ch);
        }
    }
    result
}

/// Extract a percentage value from text (e.g. "45.2% used" → 45.2).
fn extract_percentage(text: &str) -> Option<f64> {
    let text = text.trim();
    for word in text.split_whitespace() {
        let word = word.trim_end_matches('%');
        if let Ok(val) = word.parse::<f64>() {
            if (0.0..=100.0).contains(&val) {
                return Some(val);
            }
        }
    }
    None
}

/// Search nearby lines (current + next 5) for a percentage value.
fn find_usage_in_nearby_lines(lines: &[&str], start: usize) -> Option<(f64, Option<String>)> {
    let end = (start + 6).min(lines.len());
    for line in &lines[start..end] {
        if let Some(pct) = extract_percentage(line) {
            return Some((pct, None));
        }
    }
    None
}
