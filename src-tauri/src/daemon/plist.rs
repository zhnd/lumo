use std::path::Path;
use std::time::Duration;

use anyhow::{Context, Result};

const PLIST_TEMPLATE: &str = include_str!("../../resources/com.lumo.daemon.plist.template");

/// Render the plist template with actual paths.
pub fn render_plist(daemon_path: &Path, log_dir: &Path, home_dir: &Path) -> String {
    PLIST_TEMPLATE
        .replace("{{DAEMON_PATH}}", &daemon_path.display().to_string())
        .replace("{{LOG_DIR}}", &log_dir.display().to_string())
        .replace("{{HOME}}", &home_dir.display().to_string())
}

/// Unload the launchd service. Ignores errors (service may not be loaded).
pub async fn unload_service(plist_path: &Path) -> Result<()> {
    let _ = tokio::process::Command::new("launchctl")
        .args(["unload", &plist_path.display().to_string()])
        .output()
        .await;
    tokio::time::sleep(Duration::from_millis(500)).await;
    Ok(())
}

/// Load the launchd service.
pub async fn load_service(plist_path: &Path) -> Result<()> {
    let output = tokio::process::Command::new("launchctl")
        .args(["load", &plist_path.display().to_string()])
        .output()
        .await
        .context("Failed to run launchctl load")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("launchctl load failed: {}", stderr);
    }
    Ok(())
}
