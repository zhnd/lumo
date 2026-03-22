mod health;
mod manager;

#[cfg(target_os = "macos")]
mod plist;

#[cfg(target_os = "linux")]
mod systemd;

pub use health::check_daemon_health;
pub use manager::DaemonManager;
