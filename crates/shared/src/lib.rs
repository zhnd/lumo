//! Shared library for Lumo
//!
//! Contains database entities, repositories, and utilities shared between
//! the daemon and Tauri application.

pub mod database;
pub mod error;

// Re-export commonly used types
pub use database::connection::{create_pool, get_db_path, run_migrations};
pub use database::entities::{
    Event, EventRow, Metric, MetricRow, NewEvent, NewMetric, NewNotification, Notification,
    NotificationRow, Session,
};
pub use database::repositories::{
    EventRepository, MetricRepository, NotificationRepository, SessionRepository, SessionsSummary,
    TokenUsageByModel, TotalTokens,
};
pub use error::{Error, Result};
