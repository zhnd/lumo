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
    /// Fetch subscription usage. Prefers the CLI path (`claude /usage` inside
    /// a PTY) since it requires no direct Keychain access and matches what
    /// ClaudeBar does by default. Falls back to the OAuth API only if the CLI
    /// can't run (binary missing, PTY spawn failure, parse failure, etc).
    pub async fn fetch_usage() -> Result<SubscriptionUsageResult> {
        // Primary: CLI probe. No Keychain access — `claude` itself reads the
        // stored credentials.
        match super::claude_cli_probe::ClaudeCliProbe::fetch_usage().await {
            Ok(cli) => {
                return Ok(SubscriptionUsageResult {
                    needs_login: false,
                    usage: Some(cli.usage),
                    error: None,
                    subscription_type: cli.subscription_badge,
                });
            }
            Err(cli_err) => {
                log::warn!(
                    "CLI usage probe failed, falling back to OAuth API: {}",
                    cli_err
                );
            }
        }

        // Fallback: API path. This DOES touch the Keychain (via
        // load_credentials) because we need the OAuth access token.
        Self::fetch_via_api().await
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

