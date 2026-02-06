//! Notification entity
//!
//! Represents notifications from Claude Code hooks.

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Database row representation of a notification
#[derive(Debug, Clone, FromRow)]
pub struct NotificationRow {
    pub id: i64,
    pub session_id: String,
    pub hook_event: String,
    pub notification_type: Option<String>,
    pub title: String,
    pub message: String,
    pub cwd: Option<String>,
    pub transcript_path: Option<String>,
    pub notified: i32,
    pub read: i32,
    pub created_at: i64,
}

/// Notification entity for internal use
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    pub id: i64,
    pub session_id: String,
    pub hook_event: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notification_type: Option<String>,
    pub title: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cwd: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transcript_path: Option<String>,
    pub notified: bool,
    pub read: bool,
    pub created_at: i64,
}

/// New notification for insertion
#[derive(Debug, Clone)]
pub struct NewNotification {
    pub session_id: String,
    pub hook_event: String,
    pub notification_type: Option<String>,
    pub title: String,
    pub message: String,
    pub cwd: Option<String>,
    pub transcript_path: Option<String>,
}

impl From<NotificationRow> for Notification {
    fn from(row: NotificationRow) -> Self {
        Self {
            id: row.id,
            session_id: row.session_id,
            hook_event: row.hook_event,
            notification_type: row.notification_type,
            title: row.title,
            message: row.message,
            cwd: row.cwd,
            transcript_path: row.transcript_path,
            notified: row.notified != 0,
            read: row.read != 0,
            created_at: row.created_at,
        }
    }
}
