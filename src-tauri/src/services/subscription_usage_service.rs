//! Subscription usage service
//!
//! Scrapes Claude Pro/Max subscription usage from claude.ai via a hidden webview.
//! Uses a hidden WebviewWindow + JS DOM extraction + URL hash with request IDs.

use anyhow::{Context, Result};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::types::{LoginResolvedPayload, SubscriptionUsage, SubscriptionUsageResult};

const WEBVIEW_LABEL: &str = "claude-usage-scraper";
const USAGE_URL: &str = "https://claude.ai/settings/usage";

/// Check whether a URL corresponds to an authentication/login page.
/// Shared between `fetch_usage` (redirect detection) and `show_login` (completion detection).
fn is_auth_url(url: &str) -> bool {
    url.contains("/login")
        || url.contains("accounts.google")
        || url.contains("/oauth")
        || url.contains("/sso")
}

/// Build the extraction JavaScript with a unique request ID.
///
/// The request ID is embedded in the hash result so Rust can verify it matches
/// the current request, avoiding stale or cross-request results.
///
/// DOM matching strategy:
/// - Finds headings by `textContent.trim()` (no childNodes constraint)
/// - Walks up to 8 ancestor levels looking for a container with "% used"
/// - On parse failure (page loaded but no known sections found), returns
///   `parseError: true` instead of silently returning empty categories
fn build_extraction_js(request_id: &str) -> String {
    format!(
        r#"
(function() {{
    var REQUEST_ID = '{}';
    // Guard against duplicate injections: skip if already running for this request
    if (window.__LUMO_EXTRACT_ID === REQUEST_ID) return;
    window.__LUMO_EXTRACT_ID = REQUEST_ID;
    var attempts = 0;
    var maxAttempts = 120;

    function emit(tag, payload) {{
        window.location.hash = tag + ':' + REQUEST_ID + ':' + encodeURIComponent(JSON.stringify(payload));
    }}

    function tryExtract() {{
        attempts++;

        if (!document.body) {{
            if (attempts < maxAttempts) {{ setTimeout(tryExtract, 500); return; }}
            emit('TAURI_ERROR', {{ message: 'document.body not available' }});
            return;
        }}

        var bodyText = document.body.innerText || '';

        // Page loaded but no "% used" content found after all retries
        if (!bodyText.match(/\d+%\s*used/i)) {{
            if (attempts < maxAttempts) {{ setTimeout(tryExtract, 500); return; }}
            // Distinguish: page has substantial content (parse failure) vs blank/error page
            var hasContent = bodyText.trim().length > 100;
            emit('TAURI_RESULT', {{
                categories: [],
                fetchedAt: Date.now(),
                parseError: hasContent
            }});
            return;
        }}

        try {{
            doExtract();
        }} catch(e) {{
            emit('TAURI_ERROR', {{ message: e.message }});
        }}
    }}

    // Find a section container by heading text.
    // Relaxed matching: uses textContent.trim() equality without requiring
    // childNodes.length === 1, so icon elements or wrapper spans don't break it.
    // Walks up to 8 ancestor levels looking for a container with "% used".
    function findSectionByText(text) {{
        var allElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, strong, b');
        for (var i = 0; i < allElements.length; i++) {{
            var el = allElements[i];
            var elText = (el.textContent || '').trim();
            if (elText !== text) continue;
            // Verify this element is a reasonable heading (not a deeply nested container
            // that happens to contain the text among many other things)
            if (el.textContent.length > text.length * 3) continue;

            var parent = el.parentElement;
            for (var j = 0; j < 8 && parent; j++) {{
                if (parent.textContent && /\d+%\s*used/i.test(parent.textContent)) {{
                    return parent;
                }}
                parent = parent.parentElement;
            }}
            // Fallback: return a reasonable ancestor even without % match
            return el.parentElement && el.parentElement.parentElement
                ? el.parentElement.parentElement : null;
        }}
        return null;
    }}

    function extractPercent(text) {{
        var m = text.match(/(\d+)%\s*used/i);
        return m ? parseInt(m[1], 10) : null;
    }}

    function extractResetTime(text) {{
        var m = text.match(/Resets?\s+(?:in\s+)?([^\n]+)/i);
        if (!m) return null;
        return m[1].replace(/\s*(\d+%|used|Learn more).*$/i, '').trim() || null;
    }}

    function doExtract() {{
        var categories = [];
        var missedSections = [];

        var sections = [
            {{ text: 'Current session',  name: 'current_session' }},
            {{ text: 'All models',       name: 'all_models' }},
            {{ text: 'Sonnet only',      name: 'sonnet_only' }},
            {{ text: 'Extra usage',      name: 'extra_usage' }}
        ];

        for (var s = 0; s < sections.length; s++) {{
            var sec = sections[s];
            var container = findSectionByText(sec.text);
            if (!container) {{
                missedSections.push(sec.text);
                continue;
            }}

            var containerText = container.innerText || '';
            var percent = extractPercent(containerText);
            if (percent === null) {{
                missedSections.push(sec.text + ' (no %)');
                continue;
            }}

            var resetsIn = extractResetTime(containerText);

            var amountSpent = null;
            var amountLimit = null;
            var amountBalance = null;
            if (sec.name === 'extra_usage') {{
                var spentMatch = containerText.match(/[A-Z]{{0,3}}[$\u20ac\u00a3][\d,.]+(?=\s*spent)/i);
                if (spentMatch) amountSpent = spentMatch[0];
                var limitMatch = containerText.match(/([A-Z]{{0,3}}[$\u20ac\u00a3][\d,.]+)\s*\n\s*Monthly\s*spend/i);
                if (limitMatch) amountLimit = limitMatch[1];
                var balanceMatch = containerText.match(/([A-Z]{{0,3}}[$\u20ac\u00a3][\d,.]+)\s*\n\s*Current\s*balance/i);
                if (balanceMatch) amountBalance = balanceMatch[1];
            }}

            categories.push({{
                name: sec.name,
                label: sec.text,
                percentUsed: percent,
                resetsIn: resetsIn,
                amountSpent: amountSpent,
                amountLimit: amountLimit,
                amountBalance: amountBalance
            }});
        }}

        // If page clearly has "% used" content but we found zero categories,
        // that's a parse failure, not "no subscription"
        var parseError = categories.length === 0 && missedSections.length > 0;

        emit('TAURI_RESULT', {{
            categories: categories,
            fetchedAt: Date.now(),
            parseError: parseError
        }});
    }}

    tryExtract();
}})();
"#,
        request_id
    )
}

pub struct SubscriptionUsageService;

impl SubscriptionUsageService {
    /// Fetch subscription usage by navigating a hidden webview to claude.ai/settings/usage.
    pub async fn fetch_usage(app_handle: &AppHandle) -> Result<SubscriptionUsageResult> {
        // Check if webview already exists and is on the usage page (skip navigation wait)
        let already_on_usage = app_handle
            .get_webview_window(WEBVIEW_LABEL)
            .and_then(|w| w.url().ok())
            .map(|u| u.as_str().starts_with(USAGE_URL))
            .unwrap_or(false);

        let webview = Self::get_or_create_webview(app_handle, USAGE_URL)?;

        // Ensure webview is hidden (may still be visible from a previous login flow)
        let _ = webview.hide();

        // Only wait for navigation if we actually navigated to a new page
        if !already_on_usage {
            let target_settled = Self::wait_for_navigation(&webview, 10).await;

            if !target_settled {
                log::warn!("Navigation did not settle within timeout, proceeding anyway");
            }
        }

        // Check if we got redirected to login (unified check)
        let current_url = webview.url().context("Failed to get webview URL")?;
        let current_str = current_url.as_str();
        if is_auth_url(current_str) {
            return Ok(SubscriptionUsageResult {
                needs_login: true,
                usage: None,
                error: None,
                parse_error: false,
            });
        }

        // Generate a unique request ID to match results
        let request_id = format!("{}", std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis());

        // Clear any stale hash before injecting
        let _ = webview.eval("window.location.hash = '';");
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        // Inject extraction script with request ID
        let js = build_extraction_js(&request_id);
        webview
            .eval(&js)
            .context("Failed to inject extraction script")?;

        // Poll URL hash for result, verifying request ID matches.
        // Re-inject the extraction script periodically in case the initial
        // injection was lost during page navigation (the script guards against
        // duplicate execution via window.__LUMO_EXTRACT_ID).
        // Timeout: 3 minutes (360 × 500ms). UI shows loading during this time.
        let mut last_inject = std::time::Instant::now();
        for i in 0..360 {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;

            let url = webview.url().context("Failed to get webview URL")?;
            let url_str = url.as_str();

            // Detect network errors early: webview stuck on blank/error page
            if i == 20 {
                // After 10s, if URL is still blank or an error page, network is likely down
                if url_str == "about:blank" || url_str.starts_with("about:") {
                    return Ok(SubscriptionUsageResult {
                        needs_login: false,
                        usage: None,
                        error: Some("Unable to connect to claude.ai. Please check your network connection.".to_string()),
                        parse_error: false,
                    });
                }
            }

            // Re-inject every ~5s if no result yet
            if i > 0 && last_inject.elapsed() > std::time::Duration::from_secs(5) {
                log::debug!("Re-injecting extraction script (poll iteration {})", i);
                let _ = webview.eval("window.location.hash = '';");
                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                let _ = webview.eval(&js);
                last_inject = std::time::Instant::now();
            }

            let fragment = url.fragment().unwrap_or("");

            // Expected format: TAG:REQUEST_ID:ENCODED_JSON
            if let Some(rest) = fragment.strip_prefix("TAURI_RESULT:") {
                if let Some(json_encoded) = rest.strip_prefix(&format!("{}:", request_id)) {
                    let _ = webview.eval("window.location.hash = '';");

                    let json_str = urlencoding::decode(json_encoded)
                        .context("Failed to decode URL fragment")?;

                    let usage: SubscriptionUsage =
                        serde_json::from_str(&json_str).context("Failed to parse usage JSON")?;

                    let parse_error = usage.parse_error.unwrap_or(false);

                    return Ok(SubscriptionUsageResult {
                        needs_login: false,
                        usage: Some(usage),
                        error: None,
                        parse_error,
                    });
                }
                // Request ID mismatch — stale result, ignore and keep polling
            }

            if let Some(rest) = fragment.strip_prefix("TAURI_ERROR:") {
                if let Some(json_encoded) = rest.strip_prefix(&format!("{}:", request_id)) {
                    let _ = webview.eval("window.location.hash = '';");

                    let json_str = urlencoding::decode(json_encoded)
                        .context("Failed to decode error fragment")?;

                    let error_obj: serde_json::Value =
                        serde_json::from_str(&json_str).unwrap_or_default();
                    let error_msg = error_obj["message"]
                        .as_str()
                        .unwrap_or("Unknown extraction error")
                        .to_string();

                    return Ok(SubscriptionUsageResult {
                        needs_login: false,
                        usage: None,
                        error: Some(error_msg),
                        parse_error: false,
                    });
                }
            }
        }

        Ok(SubscriptionUsageResult {
            needs_login: false,
            usage: None,
            error: Some("Unable to load usage data. Please try again later.".to_string()),
            parse_error: false,
        })
    }

    /// Show the login webview so the user can authenticate with claude.ai.
    ///
    /// Spawns a background task that polls the webview URL every 2s.
    /// Emits `"claude-login-resolved"` with a `LoginResolvedPayload` indicating
    /// whether login succeeded, the window was closed, or the poll timed out.
    pub fn show_login(app_handle: &AppHandle) -> Result<()> {
        let webview = Self::get_or_create_webview(app_handle, "https://claude.ai/login")?;
        webview.show().context("Failed to show webview")?;
        webview
            .set_focus()
            .context("Failed to focus webview")?;

        let handle = app_handle.clone();
        tokio::spawn(async move {
            // Max ~5 minutes (150 × 2s)
            for _ in 0..150 {
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;

                let Some(wv) = handle.get_webview_window(WEBVIEW_LABEL) else {
                    log::info!("Login webview closed by user");
                    let _ = handle.emit(
                        "claude-login-resolved",
                        LoginResolvedPayload { status: "cancelled".to_string() },
                    );
                    return;
                };

                let Ok(url) = wv.url() else { continue };
                let url_str = url.as_str();

                let on_claude = url_str.starts_with("https://claude.ai");
                if on_claude && !is_auth_url(url_str) {
                    log::info!("Login detected, hiding webview (url: {})", url_str);
                    let _ = wv.hide();
                    let _ = handle.emit(
                        "claude-login-resolved",
                        LoginResolvedPayload { status: "success".to_string() },
                    );
                    return;
                }
            }

            log::warn!("Login poll timed out");
            let _ = handle.emit(
                "claude-login-resolved",
                LoginResolvedPayload { status: "timeout".to_string() },
            );
        });

        Ok(())
    }

    /// Hide the login webview.
    pub fn hide_login(app_handle: &AppHandle) -> Result<()> {
        if let Some(webview) = app_handle.get_webview_window(WEBVIEW_LABEL) {
            webview.hide().context("Failed to hide webview")?;
        }
        Ok(())
    }

    /// Logout by clearing all browsing data (cookies, storage) and destroying the webview.
    /// The next `fetch_usage` or `show_login` call will create a fresh webview.
    pub fn logout(app_handle: &AppHandle) -> Result<()> {
        if let Some(webview) = app_handle.get_webview_window(WEBVIEW_LABEL) {
            let _ = webview.clear_all_browsing_data();
            webview.destroy().context("Failed to destroy webview")?;
        }
        Ok(())
    }

    fn get_or_create_webview(app_handle: &AppHandle, url: &str) -> Result<tauri::WebviewWindow> {
        if let Some(existing) = app_handle.get_webview_window(WEBVIEW_LABEL) {
            // Skip navigation if already on the target page (avoids full reload)
            let already_there = existing
                .url()
                .map(|u| u.as_str().starts_with(url))
                .unwrap_or(false);

            if !already_there {
                let parsed: tauri::Url = url.parse().context("Invalid URL")?;
                existing
                    .navigate(parsed)
                    .context("Failed to navigate existing webview")?;
            }
            return Ok(existing);
        }

        let webview = WebviewWindowBuilder::new(
            app_handle,
            WEBVIEW_LABEL,
            WebviewUrl::External(url.parse().unwrap()),
        )
        .title("Claude")
        .inner_size(500.0, 700.0)
        .visible(false)
        .skip_taskbar(true)
        .build()
        .context("Failed to create webview window")?;

        Ok(webview)
    }

    /// Poll the webview URL until it stops changing or reaches a non-blank state.
    /// Returns true if the URL settled, false on timeout.
    async fn wait_for_navigation(webview: &tauri::WebviewWindow, max_polls: u32) -> bool {
        let mut last_url = String::new();
        let mut stable_count = 0u32;

        for _ in 0..max_polls {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;

            let Ok(url) = webview.url() else { continue };
            let url_str = url.as_str().to_string();

            if url_str == last_url {
                stable_count += 1;
                if stable_count >= 2 {
                    return true;
                }
            } else {
                stable_count = 0;
                last_url = url_str;
            }
        }

        false
    }
}
