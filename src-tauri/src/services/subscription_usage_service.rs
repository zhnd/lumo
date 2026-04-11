//! Subscription usage service
//!
//! Fetches Claude Pro/Max subscription usage from Anthropic's OAuth API
//! using credentials managed by Claude Code.

use anyhow::{Context, Result};

use super::claude_credentials;
use crate::types::{SubscriptionUsageResponse, SubscriptionUsageResult};

const USAGE_URL: &str = "https://api.anthropic.com/api/oauth/usage";

/// API response structure (snake_case from the API, converted to camelCase by our types)
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

pub struct SubscriptionUsageService;

impl SubscriptionUsageService {
    pub async fn fetch_usage() -> Result<SubscriptionUsageResult> {
        let access_token = match claude_credentials::load_access_token() {
            Some(token) => token,
            None => {
                return Ok(SubscriptionUsageResult {
                    needs_login: true,
                    usage: None,
                    error: None,
                });
            }
        };

        let client = reqwest::Client::new();
        let response = client
            .get(USAGE_URL)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("anthropic-beta", "oauth-2025-04-20")
            .timeout(std::time::Duration::from_secs(15))
            .send()
            .await
            .context("Failed to connect to Anthropic API")?;

        let status = response.status();

        if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
            return Ok(SubscriptionUsageResult {
                needs_login: true,
                usage: None,
                error: None,
            });
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
            });
        }

        if !status.is_success() {
            return Ok(SubscriptionUsageResult {
                needs_login: false,
                usage: None,
                error: Some(format!("API returned HTTP {}", status.as_u16())),
            });
        }

        let api_response: ApiUsageResponse = match response.json().await {
            Ok(parsed) => parsed,
            Err(e) => {
                return Ok(SubscriptionUsageResult {
                    needs_login: false,
                    usage: None,
                    error: Some(format!("Failed to parse usage response: {}", e)),
                });
            }
        };

        let usage = Self::convert_response(api_response);

        Ok(SubscriptionUsageResult {
            needs_login: false,
            usage: Some(usage),
            error: None,
        })
    }

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
