//! Fallback probe that shells out to `claude /usage` when the OAuth API is
//! unreachable or blocked. Ported from ClaudeBar's `ClaudeUsageProbe.swift`.

use std::path::PathBuf;
use std::time::Duration;

use anyhow::{bail, Context, Result};
use regex::Regex;

use super::interactive_runner::{run_interactive, RunOptions};
use super::terminal_renderer::TerminalRenderer;
use crate::types::{ExtraUsage, SubscriptionUsageResponse, UsageBucket};

/// Environment variable that must be stripped before invoking `claude` —
/// setup-tokens only have `user:inference` scope, which can't hit `/usage`.
const ENV_EXCLUSION: &str = "CLAUDE_CODE_OAUTH_TOKEN";

/// Result of a CLI probe run, combining parsed usage data with any
/// metadata we could read from the CLI output itself (e.g. the account
/// tier shown in the header row). Keeping these in one struct lets the
/// caller avoid touching the Keychain just for a badge string.
pub struct CliProbeResult {
    /// Parsed usage buckets. `None` for account types that don't have
    /// subscription quotas (e.g. pay-per-use API billing accounts).
    pub usage: Option<SubscriptionUsageResponse>,
    /// Normalized subscription badge: "MAX", "PRO", "API", or a
    /// pass-through of whatever the header said. `None` means we didn't
    /// recognize the header line.
    pub subscription_badge: Option<String>,
}

pub struct ClaudeCliProbe;

impl ClaudeCliProbe {
    /// Run `claude /usage` inside a PTY, render the ANSI output, and parse
    /// the usage buckets. Blocking I/O is offloaded via `spawn_blocking` so
    /// the async caller isn't held up by the PTY read loop.
    pub async fn fetch_usage() -> Result<CliProbeResult> {
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

        let subscription_badge = detect_subscription_badge(&rendered);

        // API billing accounts don't have subscription quotas — the CLI
        // prints a "Sonnet 4.5 · API Usage Billing" header and either no
        // bucket sections at all or a "/usage is only available for
        // subscription plans" message. Rather than bailing (which would
        // fall through to the OAuth API path and ultimately surface a
        // misleading "Claude Code login required"), return a successful
        // result with `usage = None` so the frontend can render a
        // dedicated API-billing empty state.
        if subscription_badge.as_deref() == Some("API") {
            return Ok(CliProbeResult {
                usage: None,
                subscription_badge,
            });
        }

        let usage = parse_usage_output(&rendered)?;

        Ok(CliProbeResult {
            usage: Some(usage),
            subscription_badge,
        })
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

    // Each bucket extracts its own reset — we don't fabricate a shared
    // weekly reset for sub-buckets (Opus / Sonnet). If the CLI doesn't
    // print a reset line inside the sub-bucket's window, that bucket's
    // `resets_at` is `None` and the UI hides it.
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
        extra_usage: extract_extra_usage(text, &lines),
    })
}

/// Parse the "Extra usage" section from a Pro/Max account's `/usage` output.
/// Returns `None` when the section is absent or explicitly disabled.
///
/// Expected layout:
/// ```text
/// Extra usage
/// █████░░░░░░░░░░░░░░░ 27% used
/// $5.41 / $20.00 spent · Resets Jan 1, 2026
/// ```
///
/// The frontend displays `used_credits` / `monthly_limit` as dollars after
/// dividing by 100, so we store the values in **cents** here to match the
/// OAuth API response shape.
fn extract_extra_usage(full_text: &str, lines: &[&str]) -> Option<ExtraUsage> {
    let lower_full = full_text.to_lowercase();
    if !lower_full.contains("extra usage") {
        return None;
    }
    // Honor explicit opt-out so we don't render an empty card.
    if lower_full.contains("extra usage not enabled") {
        return None;
    }

    let start_idx = lines
        .iter()
        .position(|line| line.to_lowercase().contains("extra usage"))?;

    // The percentage bar isn't guaranteed to be present on every account,
    // but when it is, it sits within the section window like any other
    // bucket — reuse the shared extractor so the 12-line window is consistent.
    let utilization: Option<f64> = match extract_percent(lines, "extra usage") {
        SectionPercent::Used(v) => Some(v),
        SectionPercent::Untouched | SectionPercent::NotFound => None,
    };

    // Scan the next ~10 lines for "$X / $Y spent" (the section always shows
    // the cost line on its own row right after the bar).
    let cost_re =
        Regex::new(r"(?i)\$?([\d,]+\.?\d*)\s*/\s*\$?([\d,]+\.?\d*)\s*spent").ok()?;

    // Scan the same 10-line window for a reset text line so we can surface
    // the Extra usage reset date if the CLI prints one (e.g. "Resets Jan 1, 2026").
    let resets_at = extract_reset(lines, "extra usage");

    let end = (start_idx + 10).min(lines.len());
    for line in &lines[start_idx..end] {
        if let Some(caps) = cost_re.captures(line) {
            let spent_dollars = caps
                .get(1)?
                .as_str()
                .replace(',', "")
                .parse::<f64>()
                .ok()?;
            let budget_dollars = caps
                .get(2)?
                .as_str()
                .replace(',', "")
                .parse::<f64>()
                .ok()?;
            // Convert to cents so the frontend's /100 formatter produces the
            // right display string.
            return Some(ExtraUsage {
                is_enabled: true,
                utilization,
                used_credits: Some(spent_dollars * 100.0),
                monthly_limit: Some(budget_dollars * 100.0),
                resets_at: resets_at.clone(),
            });
        }
    }

    // Section header found but no parseable cost line — still report the
    // section as enabled so the UI can show the bar without a dollar total.
    utilization.map(|u| ExtraUsage {
        is_enabled: true,
        utilization: Some(u),
        used_credits: None,
        monthly_limit: None,
        resets_at,
    })
}

/// Detect the subscription tier from the `claude /usage` header row.
/// Example headers: `"Opus 4.5 · Claude Max"`, `"Sonnet 4.5 · Claude Pro"`,
/// `"Sonnet 4.5 · API Usage Billing"`. We only scan the first ~6 rendered
/// lines since the tier always appears at the top.
fn detect_subscription_badge(text: &str) -> Option<String> {
    let head: String = text.lines().take(6).collect::<Vec<_>>().join("\n");
    let lower = head.to_lowercase();

    if lower.contains("· claude max") || lower.contains("·claude max") {
        Some("MAX".to_string())
    } else if lower.contains("· claude pro") || lower.contains("·claude pro") {
        Some("PRO".to_string())
    } else if lower.contains("api usage billing") {
        Some("API".to_string())
    } else {
        None
    }
}

fn build_bucket(lines: &[&str], label_candidates: &[&str]) -> Option<UsageBucket> {
    for label in label_candidates {
        match extract_percent(lines, label) {
            SectionPercent::NotFound => continue,
            SectionPercent::Untouched => {
                // Bucket exists in the CLI output but has no usage yet.
                // `utilization: None` tells the frontend to render an
                // empty state ("You haven't used X yet") instead of a
                // gauge at 100% remaining. Reset is also left None
                // unless the CLI prints one inside this section's window.
                return Some(UsageBucket {
                    utilization: None,
                    resets_at: extract_reset(lines, label),
                });
            }
            SectionPercent::Used(pct) => {
                return Some(UsageBucket {
                    utilization: Some(pct),
                    resets_at: extract_reset(lines, label),
                });
            }
        }
    }
    None
}

/// Tri-state result for reading a section's percent.
#[derive(Debug, PartialEq)]
enum SectionPercent {
    /// The label wasn't in the output at all — bucket does not exist.
    NotFound,
    /// The label IS in the output but the bucket has no usage yet
    /// (CLI prints `0% used` with no progress-bar character, or the
    /// section window has no percent line at all).
    Untouched,
    /// The bucket reports a concrete usage percentage.
    Used(f64),
}

/// Find the line containing `label_substring` (case-insensitive) and scan
/// the next 12 lines for a percentage token. Mirrors ClaudeBar's
/// "first match wins" behaviour within a small window: once we find a
/// line that looks like a `X% used/left` statement we commit to that
/// verdict, preventing subsequent sections from bleeding in.
fn extract_percent(lines: &[&str], label_substring: &str) -> SectionPercent {
    let label = label_substring.to_lowercase();

    for (idx, line) in lines.iter().enumerate() {
        if !line.to_lowercase().contains(&label) {
            continue;
        }
        let end = (idx + 12).min(lines.len());
        for candidate in &lines[idx + 1..end] {
            if !line_has_percent_token(candidate) {
                continue;
            }
            // Commit to the first line with a percent token. A "0% used"
            // line with no filled block character is the CLI's signal
            // that the bucket exists but hasn't been touched yet — we
            // report it as Untouched so the UI can render an empty
            // state. Any other value (including genuine 0% with a bar)
            // is a real usage value.
            match percent_from_line(candidate) {
                Some(v) if v == 0.0 && !has_filled_block_char(candidate) => {
                    return SectionPercent::Untouched;
                }
                Some(v) => return SectionPercent::Used(v),
                // Malformed percent line — fall through and treat the
                // section as present but empty.
                None => return SectionPercent::Untouched,
            }
        }
        // Label present, window scanned, no percent token anywhere.
        return SectionPercent::Untouched;
    }
    SectionPercent::NotFound
}

/// Cheap pre-check: does `line` look like it has `X% used` or `X% left`?
fn line_has_percent_token(line: &str) -> bool {
    let lower = line.to_lowercase();
    (lower.contains("% used") || lower.contains("% left"))
        && line.chars().any(|c| c.is_ascii_digit())
}

fn percent_from_line(line: &str) -> Option<f64> {
    // Regex matches "65% left", "25% used", etc. with flexible whitespace.
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

/// Returns true if `line` contains any Unicode "filled block" character
/// in the range `U+2588..=U+258F` (FULL BLOCK through LEFT ONE EIGHTH
/// BLOCK). These are the glyphs the Claude CLI uses to draw progress
/// bars. An untouched bucket renders as whitespace + `0% used` with NO
/// block characters at all — that absence is the "not used yet" signal.
fn has_filled_block_char(line: &str) -> bool {
    line.chars().any(|c| ('\u{2588}'..='\u{258F}').contains(&c))
}

/// Extract the reset text near a section label. The returned string is
/// display-ready (e.g. `"in 18m"`, `"4:59pm (America/New_York)"`) with the
/// leading `"Resets "` word removed. The frontend renders it verbatim
/// under a `"Resets "` label, matching the API path's formatted output.
///
/// The forward scan stops at section boundaries (lines that begin a new
/// known section like `"Extra usage"`) so we never bleed an unrelated
/// section's reset text into the current bucket.
fn extract_reset(lines: &[&str], label_substring: &str) -> Option<String> {
    let label = label_substring.to_lowercase();
    for (idx, start_line) in lines.iter().enumerate() {
        if !start_line.to_lowercase().contains(&label) {
            continue;
        }
        let end = (idx + 14).min(lines.len());
        // Skip the label line itself (index 0 in the slice) — it may contain
        // the word "reset" as part of its own text on future CLI versions.
        for candidate in &lines[idx + 1..end] {
            let lower = candidate.to_lowercase();
            // Stop if we cross into the Extra usage section. Its cost line
            // ends in "Resets <date>" which would otherwise be mis-attributed
            // to preceding weekly buckets when the CLI omits a weekly reset.
            if lower.contains("extra usage") && !label.contains("extra") {
                return None;
            }
            if lower.contains("reset") {
                return Some(strip_resets_prefix(candidate));
            }
        }
        return None;
    }
    None
}

/// Strip a leading case-insensitive "Resets" word (and any following
/// whitespace) from a line. If the line doesn't start with "Resets",
/// returns the trimmed line as-is — some CLI layouts put the reset text
/// on a line that begins with cost info (e.g. `"$5.41 / $20.00 spent · Resets Jan 1, 2026"`),
/// in which case we take everything after the LAST "Resets" token.
fn strip_resets_prefix(line: &str) -> String {
    let trimmed = line.trim();
    // Locate the last case-insensitive "resets" occurrence; this handles
    // both leading and mid-line cases robustly.
    let lower = trimmed.to_lowercase();
    if let Some(pos) = lower.rfind("resets") {
        let after = &trimmed[pos + "resets".len()..];
        after.trim_start().to_string()
    } else {
        trimmed.to_string()
    }
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
        assert_eq!(
            extract_percent(&lines, "current session"),
            SectionPercent::Used(35.0)
        );
    }

    #[test]
    fn detect_subscription_badge_matches_header() {
        assert_eq!(
            detect_subscription_badge("Opus 4.5 · Claude Max · Organization\n"),
            Some("MAX".to_string())
        );
        assert_eq!(
            detect_subscription_badge("Sonnet 4.5 · Claude Pro\n"),
            Some("PRO".to_string())
        );
        assert_eq!(
            detect_subscription_badge("Sonnet 4.5 · API Usage Billing\n"),
            Some("API".to_string())
        );
        assert_eq!(detect_subscription_badge("Something else\n"), None);
    }

    #[test]
    fn extra_usage_with_cost_line() {
        let sample = "\
Opus 4.5 · Claude Pro

Current session
█████████████░░░░░░░ 18% used
Resets 4:59pm

Extra usage
█████░░░░░░░░░░░░░░░ 27% used
$5.41 / $20.00 spent · Resets Jan 1, 2026
";
        let parsed = parse_usage_output(sample).expect("should parse");
        let extra = parsed.extra_usage.expect("extra usage should be present");
        assert!(extra.is_enabled);
        assert_eq!(extra.utilization, Some(27.0));
        assert_eq!(extra.used_credits, Some(541.0));
        assert_eq!(extra.monthly_limit, Some(2000.0));
        // The reset line appears on the same row as the cost, so `strip_resets_prefix`
        // should take the substring after "Resets" and return just the date.
        assert_eq!(extra.resets_at.as_deref(), Some("Jan 1, 2026"));
    }

    #[test]
    fn strip_resets_prefix_handles_leading_and_inline() {
        assert_eq!(strip_resets_prefix("Resets in 18m"), "in 18m");
        assert_eq!(
            strip_resets_prefix("Resets 4:59pm (America/New_York)"),
            "4:59pm (America/New_York)"
        );
        // Inline usage: "cost line · Resets DATE"
        assert_eq!(
            strip_resets_prefix("$5.41 / $20.00 spent · Resets Jan 1, 2026"),
            "Jan 1, 2026"
        );
        // No "Resets" prefix at all: return trimmed as-is
        assert_eq!(strip_resets_prefix("  some other text  "), "some other text");
    }

    #[test]
    fn extract_reset_returns_display_ready_text() {
        let lines = vec![
            "Current session",
            "█████████████░░░░░░░ 18% used",
            "Resets in 2h 15m",
        ];
        assert_eq!(
            extract_reset(&lines, "current session"),
            Some("in 2h 15m".to_string())
        );
    }

    #[test]
    fn sonnet_weekly_does_not_steal_extra_usage_reset() {
        // Regression: the CLI only prints one weekly reset (next to "Current
        // week (all models)"). Sonnet/Opus have no reset line of their own —
        // per-bucket extraction must stop at the Extra usage boundary so the
        // `· Resets May 1` fragment doesn't leak into Sonnet.
        let sample = "\
Opus 4.5 · Claude Max

Current week (all models)
█████░░░░░░░░░░░░░░░ 30% used
Resets in 6d

Current week (Opus)
█████░░░░░░░░░░░░░░░ 30% used

Current week (Sonnet only)
████░░░░░░░░░░░░░░░░ 20% used

Extra usage
█████░░░░░░░░░░░░░░░ 27% used
$5.41 / $20.00 spent · Resets May 1
";
        let parsed = parse_usage_output(sample).expect("should parse");

        let weekly = parsed.seven_day.expect("weekly bucket");
        assert_eq!(weekly.resets_at.as_deref(), Some("in 6d"));

        // Opus / Sonnet have their own percentages but no dedicated reset
        // line — they MUST NOT borrow the Extra usage "May 1" text. Their
        // resets_at is `None` (the UI hides the reset line).
        let opus = parsed.seven_day_opus.expect("opus bucket");
        assert_eq!(opus.utilization, Some(30.0));
        assert!(
            opus.resets_at.is_none(),
            "Opus must not leak Extra usage reset, got: {:?}",
            opus.resets_at
        );

        let sonnet = parsed.seven_day_sonnet.expect("sonnet bucket");
        assert_eq!(sonnet.utilization, Some(20.0));
        assert!(
            sonnet.resets_at.is_none(),
            "Sonnet must not leak Extra usage reset, got: {:?}",
            sonnet.resets_at
        );

        // Extra usage still gets its own reset.
        let extra = parsed.extra_usage.expect("extra usage");
        assert_eq!(extra.resets_at.as_deref(), Some("May 1"));
    }

    #[test]
    fn real_cli_output_produces_expected_buckets() {
        // Exact rendered output captured from a real Max account where the
        // user hasn't touched Sonnet or Opus. The CLI still prints a
        // "Current week (Sonnet only)" section with whitespace + "0% used"
        // (no bar, no reset line). Opus is omitted entirely. Lumo must:
        //   - show session, weekly (all models), extra usage with their
        //     own utilization AND reset strings
        //   - drop opus (section missing from CLI output)
        //   - show sonnet as an "untouched" bucket: `utilization = None`
        //     (no gauge, frontend renders "You haven't used Sonnet yet")
        //     and `resets_at = None` (no reset line in CLI, don't fabricate)
        let sample = "\
  Current session
  ███████████████                                    30% used
  Resets 4am (Asia/Shanghai)

  Current week (all models)
  ███████████████▌                                   31% used
  Resets 11am (Asia/Shanghai)

  Current week (Sonnet only)
                                                     0% used

  Extra usage
  ▋                                                  1% used
  $0.88 / $70.00 spent · Resets May 1 (Asia/Shanghai)
";
        let parsed = parse_usage_output(sample).expect("should parse real output");

        let session = parsed.five_hour.as_ref().expect("session bucket");
        assert_eq!(session.utilization, Some(30.0));
        assert_eq!(session.resets_at.as_deref(), Some("4am (Asia/Shanghai)"));

        let weekly = parsed.seven_day.as_ref().expect("weekly bucket");
        assert_eq!(weekly.utilization, Some(31.0));
        assert_eq!(weekly.resets_at.as_deref(), Some("11am (Asia/Shanghai)"));

        assert!(
            parsed.seven_day_opus.is_none(),
            "Opus must be None (section absent), got: {:?}",
            parsed.seven_day_opus
        );

        // Sonnet section IS printed but the user hasn't used it. The bucket
        // exists (so the UI can show an empty state card) with no
        // utilization and no reset.
        let sonnet = parsed
            .seven_day_sonnet
            .as_ref()
            .expect("sonnet bucket should be present even at 0%");
        assert!(
            sonnet.utilization.is_none(),
            "Sonnet utilization must be None (untouched), got: {:?}",
            sonnet.utilization
        );
        assert!(
            sonnet.resets_at.is_none(),
            "Sonnet resets_at must be None — no reset line in CLI, got: {:?}",
            sonnet.resets_at
        );

        let extra = parsed.extra_usage.as_ref().expect("extra usage");
        assert_eq!(extra.utilization, Some(1.0));
        assert_eq!(extra.used_credits, Some(88.0));
        assert_eq!(extra.monthly_limit, Some(7000.0));
        assert_eq!(extra.resets_at.as_deref(), Some("May 1 (Asia/Shanghai)"));
    }

    #[test]
    fn weekly_reset_none_when_cli_omits_it() {
        // If the CLI renders weekly sections without any "Resets" line in the
        // weekly block, we must return None (not leak into Extra usage).
        let sample = "\
Opus 4.5 · Claude Max

Current week (all models)
█████░░░░░░░░░░░░░░░ 30% used

Current week (Sonnet only)
████░░░░░░░░░░░░░░░░ 20% used

Extra usage
█████░░░░░░░░░░░░░░░ 27% used
$5.41 / $20.00 spent · Resets May 1
";
        let parsed = parse_usage_output(sample).expect("should parse");

        let weekly = parsed.seven_day.expect("weekly bucket");
        assert!(
            weekly.resets_at.is_none(),
            "weekly should not claim Extra usage reset, got: {:?}",
            weekly.resets_at
        );

        let sonnet = parsed.seven_day_sonnet.expect("sonnet bucket");
        assert!(sonnet.resets_at.is_none());
    }

    #[test]
    fn extra_usage_not_enabled_returns_none() {
        let sample = "\
Opus 4.5 · Claude Pro

Current session
█████████████░░░░░░░ 18% used
Resets 4:59pm

Extra usage not enabled
";
        let parsed = parse_usage_output(sample).expect("should parse");
        assert!(parsed.extra_usage.is_none());
    }

    #[test]
    fn extra_usage_with_commas_and_decimals() {
        // Large budgets may format with a thousands separator
        let sample = "\
Opus 4.5 · Claude Max

Current session
█████████████░░░░░░░ 18% used

Extra usage
███████████░░░░░░░░░ 55% used
$1,234.56 / $2,000.00 spent
";
        let parsed = parse_usage_output(sample).expect("should parse");
        let extra = parsed.extra_usage.expect("extra usage should be present");
        assert_eq!(extra.used_credits, Some(123_456.0));
        assert_eq!(extra.monthly_limit, Some(200_000.0));
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
