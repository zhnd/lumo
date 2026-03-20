use std::path::Path;
use std::time::Duration;

use anyhow::{Context, Result};

const SERVICE_TEMPLATE: &str =
    include_str!("../../resources/com.lumo.daemon.service.template");

/// Render the systemd unit template with actual paths.
pub fn render_unit(daemon_path: &Path, log_dir: &Path, home_dir: &Path) -> String {
    SERVICE_TEMPLATE
        .replace("{{DAEMON_PATH}}", &daemon_path.display().to_string())
        .replace("{{LOG_DIR}}", &log_dir.display().to_string())
        .replace("{{HOME}}", &home_dir.display().to_string())
}

/// Stop and disable the systemd user service. Ignores errors (service may not exist).
pub async fn stop_service() -> Result<()> {
    let _ = tokio::process::Command::new("systemctl")
        .args(["--user", "stop", "lumo-daemon.service"])
        .output()
        .await;
    tokio::time::sleep(Duration::from_millis(500)).await;
    Ok(())
}

/// Reload systemd daemon and start the user service.
pub async fn start_service() -> Result<()> {
    // Reload unit files so systemd picks up the new/updated service.
    let reload = tokio::process::Command::new("systemctl")
        .args(["--user", "daemon-reload"])
        .output()
        .await
        .context("Failed to run systemctl daemon-reload")?;

    if !reload.status.success() {
        let stderr = String::from_utf8_lossy(&reload.stderr);
        log::warn!("systemctl daemon-reload warning: {}", stderr);
    }

    // Enable and start the service.
    let output = tokio::process::Command::new("systemctl")
        .args(["--user", "enable", "--now", "lumo-daemon.service"])
        .output()
        .await
        .context("Failed to run systemctl enable --now")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("systemctl enable --now failed: {}", stderr);
    }
    Ok(())
}
