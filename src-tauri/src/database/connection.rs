use anyhow::Result;
use shared::{create_pool, get_db_path, run_migrations};
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};

/// Initialize the database connection and register it with Tauri app state
///
/// Uses the shared database path (~/.lumo/lumo.db) so both daemon and Tauri
/// app access the same database.
pub async fn initialize_db(app_handle: &AppHandle) -> Result<SqlitePool> {
    // Get the shared database path (~/.lumo/lumo.db)
    let db_path = get_db_path()?;

    println!("Database path: {}", db_path.display());

    // Create the connection pool using shared library
    let pool = create_pool(&db_path).await?;

    // Register the pool with Tauri's app state
    app_handle.manage(pool.clone());

    Ok(pool)
}

/// Setup function to initialize database and run migrations
pub async fn setup(app_handle: &AppHandle) -> Result<()> {
    let pool = initialize_db(app_handle).await?;
    run_migrations(&pool).await?;
    Ok(())
}
