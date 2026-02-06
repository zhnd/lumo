//! Usage service
//!
//! Fetches rate limit information from the Anthropic API.

use anyhow::{Context, Result};

use crate::types::{RateLimitHeader, UsageLimits};

pub struct UsageService;

impl UsageService {
    /// Fetch usage limits by making a minimal API request and reading response headers.
    pub async fn fetch_usage_limits(api_key: &str) -> Result<UsageLimits> {
        let client = reqwest::Client::new();

        let response = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .body(
                serde_json::json!({
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 1,
                    "messages": [{"role": "user", "content": "h"}]
                })
                .to_string(),
            )
            .send()
            .await
            .context("Failed to send request to Anthropic API")?;

        let headers: Vec<RateLimitHeader> = response
            .headers()
            .iter()
            .filter(|(name, _)| name.as_str().starts_with("anthropic-ratelimit-"))
            .filter_map(|(name, value)| {
                value.to_str().ok().map(|v| RateLimitHeader {
                    name: name.to_string(),
                    value: v.to_string(),
                })
            })
            .collect();

        // Extract status from headers (e.g. anthropic-ratelimit-tokens-remaining)
        let status = Self::determine_status(&headers);
        let resets_at = Self::extract_reset_time(&headers);

        Ok(UsageLimits {
            status,
            resets_at,
            headers,
        })
    }

    fn determine_status(headers: &[RateLimitHeader]) -> String {
        // Check for tokens-remaining to determine status
        let tokens_remaining = headers
            .iter()
            .find(|h| h.name == "anthropic-ratelimit-tokens-remaining")
            .and_then(|h| h.value.parse::<u64>().ok());

        let tokens_limit = headers
            .iter()
            .find(|h| h.name == "anthropic-ratelimit-tokens-limit")
            .and_then(|h| h.value.parse::<u64>().ok());

        match (tokens_remaining, tokens_limit) {
            (Some(remaining), Some(limit)) if limit > 0 => {
                let ratio = remaining as f64 / limit as f64;
                if ratio <= 0.0 {
                    "rejected".to_string()
                } else if ratio <= 0.1 {
                    "allowed_warning".to_string()
                } else {
                    "allowed".to_string()
                }
            }
            _ => "allowed".to_string(),
        }
    }

    fn extract_reset_time(headers: &[RateLimitHeader]) -> Option<String> {
        headers
            .iter()
            .find(|h| h.name == "anthropic-ratelimit-tokens-reset")
            .map(|h| h.value.clone())
    }
}
