mod commands;
mod daemon;
mod database;
mod services;
mod types;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_notification::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Initialize database, then ensure daemon is running.
      // Sequential to guarantee tables exist before daemon starts writing.
      let app_handle = app.handle().clone();
      tokio::spawn(async move {
        if let Err(e) = database::setup(&app_handle).await {
          log::error!("Failed to initialize database: {}", e);
          return;
        }

        match daemon::DaemonManager::new(&app_handle) {
          Ok(manager) => {
            if let Err(e) = manager.ensure_running().await {
              log::warn!("Daemon setup warning: {}", e);
            }
          }
          Err(e) => log::error!("Failed to init daemon manager: {}", e),
        }

        // Configure Claude Code to export OTEL data to the Lumo daemon.
        if let Err(e) = services::ClaudeConfigService::ensure_otel_config() {
          log::warn!("Failed to configure Claude Code OTEL: {}", e);
        }

        // Configure Claude Code hooks to forward events to the Lumo daemon.
        if let Err(e) = services::ClaudeConfigService::ensure_hooks_config() {
          log::warn!("Failed to configure Claude Code hooks: {}", e);
        }

        // Start background notification poller.
        services::notification_poller::start(app_handle);
      });

      Ok(())
    })
    .invoke_handler(app_commands!())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
