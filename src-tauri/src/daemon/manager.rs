use std::path::PathBuf;
use std::time::Duration;

use anyhow::{Context, Result};
use tauri::Manager;

use super::health::check_daemon_health;
use super::plist;

/// Expected daemon version — read from crates/daemon/Cargo.toml at compile time.
const EXPECTED_VERSION: &str = env!("DAEMON_VERSION");

/// Daemon binary name.
const DAEMON_BINARY: &str = "lumo-daemon";

pub struct DaemonManager {
    /// ~/.lumo/bin/lumo-daemon
    binary_path: PathBuf,
    /// ~/Library/LaunchAgents/com.lumo.daemon.plist
    plist_path: PathBuf,
    /// ~/Library/Logs/com.lumo.daemon/
    log_dir: PathBuf,
    /// User home directory
    home_dir: PathBuf,
    /// Source binary path (from app bundle or dev target dir)
    source_binary: PathBuf,
}

impl DaemonManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self> {
        let home_dir =
            dirs::home_dir().context("Could not determine home directory")?;

        let binary_path = home_dir.join(".lumo/bin").join(DAEMON_BINARY);
        let plist_path = home_dir
            .join("Library/LaunchAgents")
            .join("com.lumo.daemon.plist");
        let log_dir = home_dir.join("Library/Logs/com.lumo.daemon");
        let source_binary = Self::resolve_source_binary(app_handle)?;

        Ok(Self {
            binary_path,
            plist_path,
            log_dir,
            home_dir,
            source_binary,
        })
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
                health.version, EXPECTED_VERSION
            );
            return self.upgrade().await;
        }

        // Daemon not responding. Check if binary is installed and executable.
        if self.binary_path.exists() && self.is_executable() {
            // Binary exists but service is not running — try to load.
            log::info!("Daemon binary found but not running. Starting...");
            self.install_plist()?;
            plist::load_service(&self.plist_path).await?;
            return self.wait_for_health().await;
        }

        // Nothing installed — full install.
        log::info!("Daemon not installed. Installing...");
        self.install().await
    }

    /// Full install: copy binary, create plist, start service.
    async fn install(&self) -> Result<()> {
        self.do_install().await
    }

    /// Upgrade: stop service, replace binary, restart.
    /// If installation fails, attempt to reload the old service.
    async fn upgrade(&self) -> Result<()> {
        plist::unload_service(&self.plist_path).await?;

        if let Err(e) = self.do_install().await {
            log::error!("Upgrade failed, reloading old service: {}", e);
            let _ = plist::load_service(&self.plist_path).await;
            return Err(e);
        }

        Ok(())
    }

    /// Shared install steps: directories, binary, plist, load, health check.
    async fn do_install(&self) -> Result<()> {
        self.ensure_directories()?;
        self.install_binary()?;
        self.install_plist()?;
        plist::load_service(&self.plist_path).await?;
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
            std::fs::set_permissions(
                &self.binary_path,
                std::fs::Permissions::from_mode(0o755),
            )?;
        }

        log::info!("Installed daemon binary to {}", self.binary_path.display());
        Ok(())
    }

    /// Write (or overwrite) the launchd plist file.
    fn install_plist(&self) -> Result<()> {
        let content =
            plist::render_plist(&self.binary_path, &self.log_dir, &self.home_dir);

        if let Some(parent) = self.plist_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        std::fs::write(&self.plist_path, content)
            .context("Failed to write launchd plist")?;
        Ok(())
    }

    /// Create required directories.
    fn ensure_directories(&self) -> Result<()> {
        if let Some(parent) = self.binary_path.parent() {
            std::fs::create_dir_all(parent)
                .context("Failed to create daemon bin directory")?;
        }
        std::fs::create_dir_all(&self.log_dir)
            .context("Failed to create daemon log directory")?;
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

        anyhow::bail!(
            "Daemon binary not found. Run `cargo build -p lumo-daemon` first."
        )
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
