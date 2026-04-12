//! Fallback probe that shells out to `claude /usage` when the OAuth API is
//! unreachable or blocked. Ported from ClaudeBar's `ClaudeUsageProbe.swift`.

use std::path::PathBuf;
use std::time::Duration;

use anyhow::{bail, Context, Result};
use regex::Regex;

use super::interactive_runner::{run_interactive, RunOptions};
use super::terminal_renderer::TerminalRenderer;
use crate::types::{SubscriptionUsageResponse, UsageBucket};

/// Environment variable that must be stripped before invoking `claude` —
/// setup-tokens only have `user:inference` scope, which can't hit `/usage`.
const ENV_EXCLUSION: &str = "CLAUDE_CODE_OAUTH_TOKEN";

pub struct ClaudeCliProbe;

impl ClaudeCliProbe {
    /// Run `claude /usage` inside a PTY, render the ANSI output, and parse
    /// the usage buckets. Blocking I/O is offloaded via `spawn_blocking` so
    /// the async caller isn't held up by the PTY read loop.
    pub async fn fetch_usage() -> Result<SubscriptionUsageResponse> {
        let claude_path = which::which("claude")
            .context("Claude CLI binary not found in PATH")?;
        log::debug!("ClaudeCliProbe: using binary at {}", claude_path.display());

        let working_dir = probe_working_directory()?;

        // Best-effort: make sure our probe directory is pre-trusted so the
        // CLI doesn't stall waiting for the interactive trust dialog.
        let _ = write_claude_trust(&working_dir);

        let raw = tokio::task::spawn_blocking(move || {
            run_interactive(
                &claude_path,
                RunOptions {
                    args: vec![
                        "/usage".to_string(),
                        "--allowed-tools".to_string(),
                        String::new(),
                    ],
                    input: None,
                    timeout: Duration::from_secs(20),
                    idle_timeout: Duration::from_secs(3),
                    working_directory: Some(working_dir),
                    env_exclusions: vec![ENV_EXCLUSION.to_string()],
                    auto_responses: vec![
                        ("Esc to cancel".to_string(), "\r".to_string()),
                        ("Ready to code here?".to_string(), "\r".to_string()),
                        ("Press Enter to continue".to_string(), "\r".to_string()),
                        ("ctrl+t to disable".to_string(), "\r".to_string()),
                        ("Yes, I trust this folder".to_string(), "\r".to_string()),
                    ],
                },
            )
        })
        .await
        .context("Interactive runner panicked")??;

        let rendered = TerminalRenderer::new().render(&raw);
        log::debug!(
            "ClaudeCliProbe: rendered {} bytes of /usage output ({} chars)",
            raw.len(),
            rendered.len()
        );

        parse_usage_output(&rendered)
    }
}

/// Parse the cleaned text of `claude /usage` into a `SubscriptionUsageResponse`.
/// Looks for the four known section labels and the shared "used/left" percentage
/// pattern. We deliberately ignore reset-time parsing here — the raw text goes
/// into the UI via `UsageBucket::resets_at` and is formatted client-side when
/// available.
fn parse_usage_output(text: &str) -> Result<SubscriptionUsageResponse> {
    let lines: Vec<&str> = text.lines().collect();
    if lines.is_empty() {
        bail!("Empty CLI output");
    }

    let five_hour = build_bucket(&lines, &["current session"]);
    let seven_day = build_bucket(&lines, &["current week (all models)"]);
    let seven_day_opus = build_bucket(&lines, &["current week (opus)"]);
    let seven_day_sonnet = build_bucket(
        &lines,
        &["current week (sonnet only)", "current week (sonnet)"],
    );

    // We need at least one bucket — otherwise the output wasn't the usage
    // screen we expected (e.g. API billing account or an unknown format).
    if five_hour.is_none()
        && seven_day.is_none()
        && seven_day_opus.is_none()
        && seven_day_sonnet.is_none()
    {
        bail!(
            "Could not find any usage sections in CLI output (got {} chars)",
            text.len()
        );
    }

    Ok(SubscriptionUsageResponse {
        five_hour,
        seven_day,
        seven_day_opus,
        seven_day_sonnet,
        // Extra usage parsing is out of scope for the first cut — the
        // credentials file already gives us `subscriptionType`, which is
        // what the UI uses to show the tier badge.
        extra_usage: None,
    })
}

fn build_bucket(lines: &[&str], label_candidates: &[&str]) -> Option<UsageBucket> {
    for label in label_candidates {
        if let Some(pct) = extract_percent(lines, label) {
            let reset = extract_reset(lines, label);
            return Some(UsageBucket {
                utilization: Some(pct),
                resets_at: reset,
            });
        }
    }
    None
}

/// Find the line containing `label_substring` (case-insensitive) and scan
/// the next 12 lines for a "X% used" or "X% left" value. Matches ClaudeBar's
/// behaviour — the CLI renders the bar on the line right after the label.
fn extract_percent(lines: &[&str], label_substring: &str) -> Option<f64> {
    let label = label_substring.to_lowercase();
    let mut found = None;

    for (idx, line) in lines.iter().enumerate() {
        if line.to_lowercase().contains(&label) {
            let end = (idx + 12).min(lines.len());
            for candidate in &lines[idx..end] {
                if let Some(value) = percent_from_line(candidate) {
                    found = Some(value);
                    break;
                }
            }
            if found.is_some() {
                break;
            }
        }
    }

    found
}

fn percent_from_line(line: &str) -> Option<f64> {
    // Regex matches "65% left", "25% used", etc. with flexible whitespace.
    // Built once per call — these lines are tiny so the cost is negligible.
    let re = Regex::new(r"(?i)([0-9]{1,3})\s*%\s*(used|left)").ok()?;
    let caps = re.captures(line)?;
    let raw = caps.get(1)?.as_str().parse::<f64>().ok()?;
    let kind = caps.get(2)?.as_str().to_lowercase();
    // API returns `utilization` as percent USED, so we normalize back to
    // "used" here for consistency with the HTTP path.
    let used = if kind.contains("left") {
        100.0 - raw
    } else {
        raw
    };
    Some(used.clamp(0.0, 100.0))
}

/// Extract the first "resets in ..." line near a section label. Returns the
/// raw trimmed text — the frontend doesn't parse CLI reset strings yet.
fn extract_reset(lines: &[&str], label_substring: &str) -> Option<String> {
    let label = label_substring.to_lowercase();
    for (idx, line) in lines.iter().enumerate() {
        if line.to_lowercase().contains(&label) {
            let end = (idx + 14).min(lines.len());
            for candidate in &lines[idx..end] {
                let lower = candidate.to_lowercase();
                if lower.contains("reset") {
                    return Some(candidate.trim().to_string());
                }
            }
        }
    }
    None
}

/// Create (or reuse) a stable working directory for the probe so every run
/// happens inside the same folder — avoids the CLI re-prompting for trust.
fn probe_working_directory() -> Result<PathBuf> {
    let home = dirs::home_dir().context("Could not locate home directory")?;
    #[cfg(target_os = "macos")]
    let base = home.join("Library/Application Support/Lumo/Probe");
    #[cfg(not(target_os = "macos"))]
    let base = home.join(".lumo/probe");

    std::fs::create_dir_all(&base)
        .with_context(|| format!("Failed to create probe directory {}", base.display()))?;
    Ok(base)
}

/// Pre-mark the probe directory as trusted in `~/.claude.json` so the CLI
/// doesn't stall on the workspace trust dialog. Safe no-op if the file
/// doesn't exist or the entry is already present.
fn write_claude_trust(working_dir: &std::path::Path) -> bool {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return false,
    };
    let path = home.join(".claude.json");
    if !path.exists() {
        return false;
    }

    let Ok(data) = std::fs::read_to_string(&path) else {
        return false;
    };
    let Ok(mut json) = serde_json::from_str::<serde_json::Value>(&data) else {
        return false;
    };

    // Walk into `.projects[<working_dir>]` and set `hasTrustDialogAccepted`.
    let projects = json
        .as_object_mut()
        .and_then(|obj| obj.entry("projects").or_insert_with(|| serde_json::json!({})).as_object_mut());
    let Some(projects) = projects else {
        return false;
    };

    let key = working_dir.to_string_lossy().into_owned();
    let entry = projects
        .entry(key)
        .or_insert_with(|| serde_json::json!({}))
        .as_object_mut();
    let Some(entry) = entry else {
        return false;
    };

    if entry.get("hasTrustDialogAccepted") == Some(&serde_json::Value::Bool(true)) {
        return false;
    }

    entry.insert(
        "hasTrustDialogAccepted".to_string(),
        serde_json::Value::Bool(true),
    );

    let Ok(serialized) = serde_json::to_string_pretty(&json) else {
        return false;
    };
    std::fs::write(&path, serialized).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn percent_from_line_handles_used_and_left() {
        assert_eq!(percent_from_line("18% used"), Some(18.0));
        assert_eq!(percent_from_line("27% left"), Some(73.0));
        assert_eq!(percent_from_line("no percent here"), None);
    }

    #[test]
    fn extract_percent_walks_label_window() {
        let lines = vec![
            "Opus 4.5 · Claude Max",
            "",
            "Current session",
            "█████████████░░░░░░░ 65% left",
            "Resets 4:59pm",
        ];
        assert_eq!(extract_percent(&lines, "current session"), Some(35.0));
    }

    #[test]
    fn parse_usage_output_builds_buckets() {
        let sample = "\
Opus 4.5 · Claude Max

Current session
█████████████░░░░░░░ 18% used
Resets 4:59pm (America/New_York)

Current week (all models)
█████████░░░░░░░░░░░ 36% used
Resets Dec 25 at 2:59pm
";
        let parsed = parse_usage_output(sample).expect("should parse");
        assert_eq!(parsed.five_hour.as_ref().unwrap().utilization, Some(18.0));
        assert_eq!(parsed.seven_day.as_ref().unwrap().utilization, Some(36.0));
    }
}
