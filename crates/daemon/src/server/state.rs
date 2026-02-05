//! Application state

use sqlx::SqlitePool;
use std::sync::Arc;

use crate::config::Config;

/// Shared application state
#[derive(Clone)]
pub struct AppState {
    /// Database connection pool
    pub db: SqlitePool,
    /// Application configuration
    #[allow(dead_code)]
    pub config: Arc<Config>,
}

impl AppState {
    /// Create a new application state
    pub fn new(db: SqlitePool, config: Config) -> Self {
        Self {
            db,
            config: Arc::new(config),
        }
    }
}
