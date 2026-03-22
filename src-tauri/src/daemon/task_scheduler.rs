use std::path::Path;

use anyhow::{Context, Result};

/// Windows Task Scheduler task name for the Lumo daemon.
const TASK_NAME: &str = "LumoDaemon";

/// Generate a Task Scheduler XML definition for the daemon.
pub fn render_task_xml(binary_path: &Path, log_dir: &Path, home_dir: &Path) -> String {
    let binary = binary_path.to_string_lossy();
    let stdout_log = log_dir.join("daemon.out.log");
    let stderr_log = log_dir.join("daemon.err.log");
    let working_dir = home_dir.to_string_lossy();

    // The XML uses the current user's logon trigger so no admin is required.
    format!(
        r#"<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>3</Count>
    </RestartOnFailure>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>{binary}</Command>
      <WorkingDirectory>{working_dir}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>"#,
        binary = binary,
        working_dir = working_dir,
    )
}

/// Create and start the daemon task via `schtasks`.
pub async fn start_service(task_xml_path: &Path) -> Result<()> {
    // Create (or replace) the scheduled task from the XML file.
    let create = tokio::process::Command::new("schtasks")
        .args([
            "/Create",
            "/TN",
            TASK_NAME,
            "/XML",
            &task_xml_path.to_string_lossy(),
            "/F",
        ])
        .output()
        .await
        .context("Failed to run schtasks /Create")?;

    if !create.status.success() {
        let stderr = String::from_utf8_lossy(&create.stderr);
        anyhow::bail!("schtasks /Create failed: {}", stderr);
    }

    // Run the task immediately.
    let run = tokio::process::Command::new("schtasks")
        .args(["/Run", "/TN", TASK_NAME])
        .output()
        .await
        .context("Failed to run schtasks /Run")?;

    if !run.status.success() {
        let stderr = String::from_utf8_lossy(&run.stderr);
        anyhow::bail!("schtasks /Run failed: {}", stderr);
    }

    Ok(())
}

/// Stop the running daemon task.
pub async fn stop_service() -> Result<()> {
    let output = tokio::process::Command::new("schtasks")
        .args(["/End", "/TN", TASK_NAME])
        .output()
        .await
        .context("Failed to run schtasks /End")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Task may not be running — treat as non-fatal.
        log::warn!("schtasks /End: {}", stderr);
    }

    Ok(())
}

/// Delete the scheduled task entirely.
pub async fn delete_service() -> Result<()> {
    let output = tokio::process::Command::new("schtasks")
        .args(["/Delete", "/TN", TASK_NAME, "/F"])
        .output()
        .await
        .context("Failed to run schtasks /Delete")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        log::warn!("schtasks /Delete: {}", stderr);
    }

    Ok(())
}
