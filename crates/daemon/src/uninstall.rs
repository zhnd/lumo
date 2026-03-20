use anyhow::{Context, Result};
use std::path::Path;
use tracing::info;

pub async fn run(delete_data: bool) -> Result<()> {
    let home_dir = dirs::home_dir().context("Could not determine home directory")?;

    // 1. Stop the running daemon service
    stop_service(&home_dir).await;

    // 2. Remove the service file
    remove_service_file(&home_dir);

    // 3. Remove the daemon binary
    let binary_path = home_dir.join(".lumo/bin/lumo-daemon");
    if binary_path.exists() {
        std::fs::remove_file(&binary_path)
            .with_context(|| format!("Failed to remove {}", binary_path.display()))?;
        info!("Removed daemon binary: {}", binary_path.display());
    }

    // 4. Optionally delete all user data
    if delete_data {
        let lumo_dir = home_dir.join(".lumo");
        if lumo_dir.exists() {
            std::fs::remove_dir_all(&lumo_dir)
                .with_context(|| format!("Failed to remove {}", lumo_dir.display()))?;
            info!("Removed data directory: {}", lumo_dir.display());
        }

        #[cfg(target_os = "macos")]
        {
            let log_dir = home_dir.join("Library/Logs/com.lumo.daemon");
            if log_dir.exists() {
                std::fs::remove_dir_all(&log_dir)
                    .with_context(|| format!("Failed to remove {}", log_dir.display()))?;
                info!("Removed log directory: {}", log_dir.display());
            }
        }
    }

    info!("Uninstall complete");
    Ok(())
}

async fn stop_service(home_dir: &Path) {
    #[cfg(target_os = "macos")]
    {
        let plist = home_dir
            .join("Library/LaunchAgents")
            .join("com.lumo.daemon.plist");
        if plist.exists() {
            let result = tokio::process::Command::new("launchctl")
                .args(["unload", &plist.to_string_lossy()])
                .output()
                .await;
            match result {
                Ok(output) if output.status.success() => {
                    info!("Unloaded launchd service");
                }
                Ok(output) => {
                    info!(
                        "launchctl unload exited with {}: {}",
                        output.status,
                        String::from_utf8_lossy(&output.stderr)
                    );
                }
                Err(e) => info!("Failed to run launchctl: {}", e),
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let _ = home_dir;
        let result = tokio::process::Command::new("systemctl")
            .args(["--user", "stop", "lumo-daemon.service"])
            .output()
            .await;
        match result {
            Ok(output) if output.status.success() => {
                info!("Stopped systemd service");
            }
            Ok(output) => {
                info!(
                    "systemctl stop exited with {}: {}",
                    output.status,
                    String::from_utf8_lossy(&output.stderr)
                );
            }
            Err(e) => info!("Failed to run systemctl: {}", e),
        }
    }
}

fn remove_service_file(home_dir: &Path) {
    #[cfg(target_os = "macos")]
    {
        let plist = home_dir
            .join("Library/LaunchAgents")
            .join("com.lumo.daemon.plist");
        if plist.exists() {
            if let Err(e) = std::fs::remove_file(&plist) {
                info!("Failed to remove plist: {}", e);
            } else {
                info!("Removed plist: {}", plist.display());
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let unit = home_dir
            .join(".config/systemd/user")
            .join("lumo-daemon.service");
        if unit.exists() {
            if let Err(e) = std::fs::remove_file(&unit) {
                info!("Failed to remove systemd unit: {}", e);
            } else {
                info!("Removed systemd unit: {}", unit.display());
            }
        }
        // Reload systemd daemon to pick up the removal
        let _ = std::process::Command::new("systemctl")
            .args(["--user", "daemon-reload"])
            .output();
    }
}
