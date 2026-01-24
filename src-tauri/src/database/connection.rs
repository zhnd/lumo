use anyhow::Result;
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    SqlitePool,
};
use std::str::FromStr;
use tauri::{AppHandle, Manager};

/// Initialize the database connection and register it with Tauri app state
pub async fn initialize_db(app_handle: &AppHandle) -> Result<SqlitePool> {
    // Get the app data directory
    let app_data_dir = app_handle
        .path()
        .app_local_data_dir()
        .expect("Failed to get app data dir");

    // Create the directory if it doesn't exist
    if !app_data_dir.exists() {
        std::fs::create_dir_all(&app_data_dir)?;
    }

    // Construct the database file path
    let db_path = app_data_dir.join("app.sqlite");
    let db_url = format!("sqlite:{}", db_path.display());

    println!("Database path: {}", db_url);

    // Create connection options
    let connection_options = SqliteConnectOptions::from_str(&db_url)?
        .create_if_missing(true);

    // Create the connection pool
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(connection_options)
        .await?;

    println!("Database connection established");

    // Register the pool with Tauri's app state
    app_handle.manage(pool.clone());

    Ok(pool)
}

/// Run database migrations
pub async fn run_migrations(pool: &SqlitePool) -> Result<()> {
    println!("Running database migrations...");

    sqlx::migrate!("./migrations")
        .run(pool)
        .await?;

    println!("Database migrations completed");
    Ok(())
}

/// Setup function to initialize database and run migrations
pub async fn setup(app_handle: &AppHandle) -> Result<()> {
    let pool = initialize_db(app_handle).await?;
    run_migrations(&pool).await?;
    Ok(())
}
