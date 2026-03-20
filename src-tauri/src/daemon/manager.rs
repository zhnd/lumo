use std::path::{Path, PathBuf};
use std::time::Duration;

use anyhow::{Context, Result};
use tauri::Manager;

use super::health::check_daemon_health;

/// Expected daemon version — read from crates/daemon/Cargo.toml at compile time.
const EXPECTED_VERSION: &str = env!("DAEMON_VERSION");

/// Daemon binary name.
const DAEMON_BINARY: &str = "lumo-daemon";

pub struct DaemonManager {
    /// ~/.lumo/bin/lumo-daemon
    binary_path: PathBuf,
    /// Platform-specific service file path:
    /// - macOS: ~/Library/LaunchAgents/com.lumo.daemon.plist
    /// - Linux: ~/.config/systemd/user/lumo-daemon.service
    service_file_path: PathBuf,
    /// Platform-specific log directory:
    /// - macOS: ~/Library/Logs/com.lumo.daemon/
    /// - Linux: ~/.lumo/logs/
    log_dir: PathBuf,
    /// User home directory
    home_dir: PathBuf,
    /// Source binary path (from app bundle or dev target dir)
    source_binary: PathBuf,
}

impl DaemonManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self> {
        let home_dir = dirs::home_dir().context("Could not determine home directory")?;

        let binary_path = home_dir.join(".lumo/bin").join(DAEMON_BINARY);

        let (service_file_path, log_dir) = Self::platform_paths(&home_dir);

        let source_binary = Self::resolve_source_binary(app_handle)?;

        Ok(Self {
            binary_path,
            service_file_path,
            log_dir,
            home_dir,
            source_binary,
        })
    }

    /// Return platform-specific (service_file_path, log_dir).
    fn platform_paths(home_dir: &Path) -> (PathBuf, PathBuf) {
        #[cfg(target_os = "macos")]
        {
            let service_file_path = home_dir
                .join("Library/LaunchAgents")
                .join("com.lumo.daemon.plist");
            let log_dir = home_dir.join("Library/Logs/com.lumo.daemon");
            (service_file_path, log_dir)
        }

        #[cfg(target_os = "linux")]
        {
            let service_file_path = home_dir
                .join(".config/systemd/user")
                .join("lumo-daemon.service");
            let log_dir = home_dir.join(".lumo/logs");
            (service_file_path, log_dir)
        }

        #[cfg(target_os = "windows")]
        {
            let service_file_path = home_dir.join(".lumo").join("daemon.json");
            let log_dir = home_dir.join(".lumo/logs");
            (service_file_path, log_dir)
        }
    }

    /// Main entry point: ensure the daemon is installed and running with the
    /// correct version.
    pub async fn ensure_running(&self) -> Result<()> {
        // Fast path: daemon is already running with the right version.
        if let Some(health) = check_daemon_health().await {
            if health.version == EXPECTED_VERSION {
                log::info!("Daemon already running (v{})", health.version);
                return Ok(());
            }
            // Version mismatch — upgrade.
            log::warn!(
                "Daemon version mismatch: running={}, expected={}. Upgrading...",
                health.version,
                EXPECTED_VERSION
            );
            return self.upgrade().await;
        }

        // Daemon not responding. Check if binary is installed and executable.
        if self.binary_path.exists() && self.is_executable() {
            // Binary exists but service is not running — try to load.
            log::info!("Daemon binary found but not running. Starting...");
            self.install_service_file()?;
            Self::start_service(&self.service_file_path).await?;
            return self.wait_for_health().await;
        }

        // Nothing installed — full install.
        log::info!("Daemon not installed. Installing...");
        self.install().await
    }

    /// Full install: copy binary, create service file, start service.
    async fn install(&self) -> Result<()> {
        self.do_install().await
    }

    /// Upgrade: stop service, replace binary, restart.
    /// If installation fails, attempt to reload the old service.
    async fn upgrade(&self) -> Result<()> {
        Self::stop_service(&self.service_file_path).await?;

        if let Err(e) = self.do_install().await {
            log::error!("Upgrade failed, reloading old service: {}", e);
            let _ = Self::start_service(&self.service_file_path).await;
            return Err(e);
        }

        Ok(())
    }

    /// Shared install steps: directories, binary, service file, start, health check.
    async fn do_install(&self) -> Result<()> {
        self.ensure_directories()?;
        self.install_binary()?;
        self.install_service_file()?;
        Self::start_service(&self.service_file_path).await?;
        self.wait_for_health().await
    }

    /// Copy daemon binary to ~/.lumo/bin/.
    fn install_binary(&self) -> Result<()> {
        std::fs::copy(&self.source_binary, &self.binary_path).with_context(|| {
            format!(
                "Failed to copy {} -> {}",
                self.source_binary.display(),
                self.binary_path.display()
            )
        })?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&self.binary_path, std::fs::Permissions::from_mode(0o755))?;
        }

        log::info!("Installed daemon binary to {}", self.binary_path.display());
        Ok(())
    }

    /// Write (or overwrite) the platform-specific service file.
    fn install_service_file(&self) -> Result<()> {
        let content = self.render_service_file();

        if let Some(parent) = self.service_file_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        std::fs::write(&self.service_file_path, content)
            .context("Failed to write service file")?;
        Ok(())
    }

    /// Render the platform-specific service file content.
    fn render_service_file(&self) -> String {
        #[cfg(target_os = "macos")]
        {
            super::plist::render_plist(&self.binary_path, &self.log_dir, &self.home_dir)
        }

        #[cfg(target_os = "linux")]
        {
            super::systemd::render_unit(&self.binary_path, &self.log_dir, &self.home_dir)
        }

        #[cfg(target_os = "windows")]
        {
            // Windows is not yet supported for daemon management.
            String::new()
        }
    }

    /// Start the daemon service (platform-specific).
    async fn start_service(_service_file_path: &PathBuf) -> Result<()> {
        #[cfg(target_os = "macos")]
        {
            super::plist::load_service(_service_file_path).await
        }

        #[cfg(target_os = "linux")]
        {
            let _ = _service_file_path;
            super::systemd::start_service().await
        }

        #[cfg(target_os = "windows")]
        {
            let _ = _service_file_path;
            anyhow::bail!("Windows daemon management is not yet supported")
        }
    }

    /// Stop the daemon service (platform-specific).
    async fn stop_service(_service_file_path: &PathBuf) -> Result<()> {
        #[cfg(target_os = "macos")]
        {
            super::plist::unload_service(_service_file_path).await
        }

        #[cfg(target_os = "linux")]
        {
            let _ = _service_file_path;
            super::systemd::stop_service().await
        }

        #[cfg(target_os = "windows")]
        {
            let _ = _service_file_path;
            anyhow::bail!("Windows daemon management is not yet supported")
        }
    }

    /// Create required directories.
    fn ensure_directories(&self) -> Result<()> {
        if let Some(parent) = self.binary_path.parent() {
            std::fs::create_dir_all(parent).context("Failed to create daemon bin directory")?;
        }
        std::fs::create_dir_all(&self.log_dir).context("Failed to create daemon log directory")?;
        Ok(())
    }

    /// Check if the installed binary has executable permission.
    fn is_executable(&self) -> bool {
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::metadata(&self.binary_path)
                .map(|m| m.permissions().mode() & 0o111 != 0)
                .unwrap_or(false)
        }
        #[cfg(not(unix))]
        {
            true
        }
    }

    /// Locate daemon binary: bundled resource (production) or target dir (dev).
    fn resolve_source_binary(app_handle: &tauri::AppHandle) -> Result<PathBuf> {
        // Production: binary bundled as a Tauri resource.
        if let Ok(resource_dir) = app_handle.path().resource_dir() {
            let bundled = resource_dir.join(DAEMON_BINARY);
            if bundled.exists() {
                return Ok(bundled);
            }

            // Some bundle layouts keep files under a `resources/` subdirectory.
            let bundled_in_subdir = resource_dir.join("resources").join(DAEMON_BINARY);
            if bundled_in_subdir.exists() {
                return Ok(bundled_in_subdir);
            }
        }

        // Dev fallback: workspace target directory.
        let workspace_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .expect("CARGO_MANIFEST_DIR has no parent")
            .to_path_buf();

        let release_path = workspace_root.join("target/release").join(DAEMON_BINARY);
        if release_path.exists() {
            return Ok(release_path);
        }

        let debug_path = workspace_root.join("target/debug").join(DAEMON_BINARY);
        if debug_path.exists() {
            return Ok(debug_path);
        }

        anyhow::bail!("Daemon binary not found. Run `cargo build -p lumo-daemon` first.")
    }

    /// Wait for the daemon to become healthy after starting, with retries.
    async fn wait_for_health(&self) -> Result<()> {
        for i in 0..10 {
            tokio::time::sleep(Duration::from_millis(500)).await;
            if let Some(health) = check_daemon_health().await {
                log::info!(
                    "Daemon started successfully (v{}) after {}ms",
                    health.version,
                    (i + 1) * 500
                );
                return Ok(());
            }
        }
        anyhow::bail!("Daemon failed to start within 5 seconds")
    }
}
