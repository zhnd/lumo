//! Database connection and migration utilities

use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};
use sqlx::SqlitePool;
use std::path::PathBuf;
use std::str::FromStr;
use tracing::info;

use crate::error::Result;

/// Get the database path
///
/// Returns `~/.lumo/lumo.db`
pub fn get_db_path() -> Result<PathBuf> {
    let home = dirs::home_dir().ok_or_else(|| {
        crate::error::Error::InvalidData("Could not determine home directory".to_string())
    })?;

    let lumo_dir = home.join(".lumo");

    // Create directory if it doesn't exist
    if !lumo_dir.exists() {
        std::fs::create_dir_all(&lumo_dir)?;
    }

    Ok(lumo_dir.join("lumo.db"))
}

/// Create a SQLite connection pool
///
/// # Arguments
/// * `db_path` - Path to the SQLite database file
pub async fn create_pool(db_path: &std::path::Path) -> Result<SqlitePool> {
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    info!("Connecting to database: {}", db_path.display());

    let options = SqliteConnectOptions::from_str(&db_url)?
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal)
        .busy_timeout(std::time::Duration::from_secs(30))
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    info!("Database connection established");

    Ok(pool)
}

/// Run database migrations
///
/// This should be called by the daemon on startup.
pub async fn run_migrations(pool: &SqlitePool) -> Result<()> {
    info!("Running database migrations...");

    sqlx::migrate!("./migrations").run(pool).await?;

    info!("Database migrations completed");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_db_path() {
        let path = get_db_path().unwrap();
        assert!(path.to_string_lossy().contains(".lumo"));
        assert!(path.to_string_lossy().ends_with("lumo.db"));
    }
}
