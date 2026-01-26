//! Session commands
//!
//! Tauri IPC commands for session operations.

use shared::SessionRepository;
use sqlx::SqlitePool;
use tauri::{command, AppHandle, Manager};

use crate::types::Session;

/// Get all sessions
#[command]
pub async fn get_sessions(app_handle: AppHandle) -> Result<Vec<Session>, String> {
    let pool = app_handle.state::<SqlitePool>();
    SessionRepository::find_all(&pool)
        .await
        .map(|sessions| sessions.into_iter().map(Session::from).collect())
        .map_err(|e| e.to_string())
}

/// Get a session by ID
#[command]
pub async fn get_session_by_id(app_handle: AppHandle, id: String) -> Result<Session, String> {
    let pool = app_handle.state::<SqlitePool>();
    SessionRepository::find_by_id(&pool, &id)
        .await
        .map(Session::from)
        .map_err(|e| e.to_string())
}
