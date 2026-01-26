mod commands;
mod database;
mod services;
mod types;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Initialize database asynchronously
      let app_handle = app.handle().clone();
      tokio::spawn(async move {
        if let Err(e) = database::setup(&app_handle).await {
          eprintln!("Failed to initialize database: {}", e);
        }
      });

      Ok(())
    })
    .invoke_handler(app_commands!())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
