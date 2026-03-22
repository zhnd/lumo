use tauri::{command, AppHandle};

#[command]
pub async fn uninstall_app(app_handle: AppHandle, delete_all_data: bool) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not determine home directory")?;
    let daemon_binary = home_dir.join(".lumo/bin/lumo-daemon");

    if daemon_binary.exists() {
        let mut cmd = tokio::process::Command::new(&daemon_binary);
        cmd.arg("uninstall");
        if delete_all_data {
            cmd.arg("--delete-data");
        }

        let output = cmd
            .output()
            .await
            .map_err(|e| format!("Failed to run daemon uninstall: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            log::warn!("Daemon uninstall stderr: {}", stderr);
        }
    } else {
        log::warn!("Daemon binary not found at {}, skipping", daemon_binary.display());
    }

    app_handle.exit(0);
    Ok(())
}
