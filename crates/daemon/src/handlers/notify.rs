//! Notification handler

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::Deserialize;
use serde_json::json;
use shared::{NewNotification, NotificationRepository};
use tracing::{error, info};

use crate::server::AppState;

/// Request payload from Claude Code hooks.
/// Hook stdin sends snake_case JSON.
#[derive(Debug, Deserialize)]
pub struct NotifyRequest {
    pub session_id: String,
    #[serde(alias = "hook_event_name")]
    pub hook_event: Option<String>,
    pub title: Option<String>,
    pub message: Option<String>,
    pub notification_type: Option<String>,
    pub cwd: Option<String>,
    pub transcript_path: Option<String>,
}

/// POST /notify — receive a notification from a Claude Code hook
pub async fn notify(
    State(state): State<AppState>,
    Json(payload): Json<NotifyRequest>,
) -> impl IntoResponse {
    let hook_event = payload.hook_event.unwrap_or_else(|| "Unknown".to_string());

    let title = payload.title.unwrap_or_else(|| default_title(&hook_event));
    let message = payload
        .message
        .unwrap_or_else(|| default_message(&hook_event));

    let notif = NewNotification {
        session_id: payload.session_id,
        hook_event: hook_event.clone(),
        notification_type: payload.notification_type,
        title,
        message,
        cwd: payload.cwd,
        transcript_path: payload.transcript_path,
    };

    match NotificationRepository::insert(&state.db, &notif).await {
        Ok(id) => {
            info!(id, hook_event = %hook_event, "Notification stored");
            (
                StatusCode::OK,
                Json(json!({
                    "status": "success",
                    "id": id,
                })),
            )
        }
        Err(e) => {
            error!("Failed to store notification: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status": "error",
                    "message": format!("Failed to store notification: {}", e),
                })),
            )
        }
    }
}

fn default_title(hook_event: &str) -> String {
    match hook_event {
        "Notification" => "Claude Code".to_string(),
        "Stop" => "Task Completed".to_string(),
        "SessionEnd" => "Session Ended".to_string(),
        _ => format!("Claude Code — {}", hook_event),
    }
}

fn default_message(hook_event: &str) -> String {
    match hook_event {
        "Notification" => "Claude Code needs your attention.".to_string(),
        "Stop" => "Claude Code has finished the current task.".to_string(),
        "SessionEnd" => "The Claude Code session has ended.".to_string(),
        _ => format!("Hook event: {}", hook_event),
    }
}
