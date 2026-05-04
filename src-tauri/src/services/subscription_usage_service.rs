//! Subscription usage service
//!
//! Fetches Claude Pro/Max subscription usage via the CLI (`claude /usage`).
//! The OAuth API fallback path is retained in this file but disabled at
//! runtime via `ENABLE_API_FALLBACK`. Flip that flag back to `true` to
//! restore CLI-then-API behavior.

use anyhow::{Context, Result};

use super::claude_credentials::{self, ClaudeCredentials};
use crate::types::{SubscriptionUsageResponse, SubscriptionUsageResult};

const USAGE_URL: &str = "https://api.anthropic.com/api/oauth/usage";
const REFRESH_URL: &str = "https://platform.claude.com/v1/oauth/token";
const CLIENT_ID: &str = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const SCOPES: &str = "user:profile user:inference user:sessions:claude_code";

/// Master switch for the OAuth API fallback path. When `false`, only the
/// CLI probe is used and the API code below is left untouched but unreached.
/// The branch is still compiled (referenced from `fetch_usage`), so the
/// API helpers don't trigger dead-code warnings.
const ENABLE_API_FALLBACK: bool = false;

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

/// OAuth 2.0 error response body (RFC 6749 §5.2).
#[derive(serde::Deserialize, Debug)]
struct OAuthErrorBody {
    error: Option<String>,
    error_description: Option<String>,
}

/// Build a shared reqwest client with User-Agent and default timeout.
///
/// Setting a User-Agent is critical: Anthropic's WAF rejects requests with
/// no UA as suspected bot traffic, returning 403 "Request not allowed".
fn http_client() -> Result<reqwest::Client> {
    reqwest::Client::builder()
        .user_agent(concat!("Lumo/", env!("CARGO_PKG_VERSION")))
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .context("Failed to build HTTP client")
}

/// Internal error type to distinguish auth failures from other errors.
enum AuthOrError {
    NeedsAuth,
    Other(anyhow::Error),
}

pub struct SubscriptionUsageService;

impl SubscriptionUsageService {
    /// Fetch subscription usage. Uses the CLI path (`claude /usage` inside
    /// a PTY) exclusively — no Keychain access, matches ClaudeBar's default.
    /// The OAuth API fallback is retained in this file but gated behind
    /// `ENABLE_API_FALLBACK` and currently off.
    pub async fn fetch_usage() -> Result<SubscriptionUsageResult> {
        match super::claude_cli_probe::ClaudeCliProbe::fetch_usage().await {
            Ok(cli) => Ok(SubscriptionUsageResult {
                needs_login: false,
                usage: cli.usage,
                error: None,
                subscription_type: cli.subscription_badge,
            }),
            Err(cli_err) => {
                if ENABLE_API_FALLBACK {
                    log::warn!(
                        "CLI usage probe failed, falling back to OAuth API: {}",
                        cli_err
                    );
                    Self::fetch_via_api().await
                } else {
                    log::warn!(
                        "CLI usage probe failed (API fallback disabled): {}",
                        cli_err
                    );
                    Ok(SubscriptionUsageResult {
                        needs_login: false,
                        usage: None,
                        error: Some(format!("CLI usage probe failed: {}", cli_err)),
                        subscription_type: None,
                    })
                }
            }
        }
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
        let client = http_client()?;
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

        let client = http_client()?;
        let response = client
            .post(REFRESH_URL)
            .header("Accept", "application/json")
            .json(&body)
            .send()
            .await
            .context("Failed to connect to token refresh endpoint")?;

        let status = response.status();
        if !status.is_success() {
            let body_text = response.text().await.unwrap_or_default();
            // Try to parse as OAuth error body per RFC 6749 §5.2
            let oauth_err: Option<OAuthErrorBody> = serde_json::from_str(&body_text).ok();
            match oauth_err.as_ref().and_then(|e| e.error.as_deref()) {
                Some("invalid_grant") => {
                    log::warn!(
                        "Token refresh rejected (invalid_grant): refresh token is no longer valid — user must re-run `claude login`"
                    );
                }
                Some(err_code) => {
                    log::warn!(
                        "Token refresh failed (HTTP {}, oauth error={}, description={}): {}",
                        status.as_u16(),
                        err_code,
                        oauth_err
                            .as_ref()
                            .and_then(|e| e.error_description.as_deref())
                            .unwrap_or("(none)"),
                        body_text
                    );
                }
                None => {
                    log::warn!(
                        "Token refresh failed with HTTP {}: {}",
                        status.as_u16(),
                        body_text
                    );
                }
            }
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
    // Response conversion
    // ---------------------------------------------------------------

    fn convert_response(api: ApiUsageResponse) -> SubscriptionUsageResponse {
        use crate::types::{ExtraUsage, UsageBucket};

        let convert_bucket = |b: ApiUsageBucket| UsageBucket {
            utilization: b.utilization,
            // Format the ISO timestamp into a display string so the frontend
            // doesn't need to parse dates — the CLI path already delivers
            // display-ready text, and both paths must look the same.
            resets_at: b.resets_at.as_deref().and_then(format_api_reset_time),
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
                // The OAuth API doesn't currently return a reset field for
                // extra_usage; leave it None and the UI will hide the row.
                resets_at: None,
            }),
        }
    }
}

/// Format an ISO 8601 timestamp into a compact human-readable "Resets in ..."
/// style string, matching the shape of the CLI probe output. Returns `None`
/// if the timestamp is already in the past or can't be parsed.
///
/// Examples:
/// - 45 minutes from now → `"in 45m"`
/// - 2 hours 15 minutes from now → `"in 2h 15m"`
/// - 3 days from now → `"in 3d"`
/// - 30 days from now → `"Jan 15"` (or `"Jan 15, 2027"` if year differs)
fn format_api_reset_time(iso: &str) -> Option<String> {
    use chrono::{DateTime, Datelike, Local, Utc};

    let parsed = DateTime::parse_from_rfc3339(iso).ok()?;
    let now = Utc::now();
    let target_utc = parsed.with_timezone(&Utc);
    let delta = target_utc.signed_duration_since(now);

    if delta.num_seconds() <= 0 {
        return None;
    }

    let total_minutes = delta.num_minutes();
    let total_hours = delta.num_hours();
    let total_days = delta.num_days();

    // < 1 hour → "in Xm"
    if total_hours < 1 {
        return Some(format!("in {}m", total_minutes.max(1)));
    }

    // < 24 hours → "in Xh" or "in Xh Ym"
    if total_days < 1 {
        let minutes_remainder = total_minutes - total_hours * 60;
        if minutes_remainder == 0 {
            return Some(format!("in {}h", total_hours));
        }
        return Some(format!("in {}h {}m", total_hours, minutes_remainder));
    }

    // < 7 days → "in Xd" or "in Xd Yh"
    if total_days < 7 {
        let hours_remainder = total_hours - total_days * 24;
        if hours_remainder == 0 {
            return Some(format!("in {}d", total_days));
        }
        return Some(format!("in {}d {}h", total_days, hours_remainder));
    }

    // >= 7 days → absolute date in local timezone, e.g. "Jan 15" or "Jan 15, 2027"
    let local = target_utc.with_timezone(&Local);
    let now_local = now.with_timezone(&Local);
    if local.year() == now_local.year() {
        Some(local.format("%b %-d").to_string())
    } else {
        Some(local.format("%b %-d, %Y").to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, Utc};

    fn iso_offset(duration: Duration) -> String {
        (Utc::now() + duration)
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
    }

    #[test]
    fn format_api_reset_time_minutes() {
        let s = format_api_reset_time(&iso_offset(Duration::minutes(15))).unwrap();
        // Allow slight clock drift between iso_offset() and format_api_reset_time()
        assert!(s == "in 15m" || s == "in 14m", "got: {}", s);
    }

    #[test]
    fn format_api_reset_time_hours_exact() {
        let s = format_api_reset_time(&iso_offset(Duration::hours(3))).unwrap();
        // Depending on rounding, might be "in 3h" or "in 2h 59m"
        assert!(s == "in 3h" || s == "in 2h 59m", "got: {}", s);
    }

    #[test]
    fn format_api_reset_time_hours_and_minutes() {
        let s = format_api_reset_time(&iso_offset(
            Duration::hours(2) + Duration::minutes(15),
        ))
        .unwrap();
        assert!(s.starts_with("in 2h 1"), "got: {}", s);
    }

    #[test]
    fn format_api_reset_time_days() {
        let s = format_api_reset_time(&iso_offset(Duration::days(3))).unwrap();
        assert!(s == "in 3d" || s == "in 2d 23h", "got: {}", s);
    }

    #[test]
    fn format_api_reset_time_far_future_uses_abs_date() {
        let s = format_api_reset_time(&iso_offset(Duration::days(30))).unwrap();
        // Should be an abbreviated month + day, NOT "in 30d"
        assert!(!s.starts_with("in "), "got: {}", s);
    }

    #[test]
    fn format_api_reset_time_past_returns_none() {
        let s = format_api_reset_time(&iso_offset(Duration::seconds(-10)));
        assert!(s.is_none());
    }

    #[test]
    fn format_api_reset_time_invalid_returns_none() {
        assert!(format_api_reset_time("not-a-date").is_none());
    }
}

