//! Notification handler

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::Deserialize;
use serde_json::json;
use shared::{NewNotification, NotificationRepository};
use tracing::{error, info};

use crate::server::AppState;

/// Request payload from Claude Code hooks.
/// Hook stdin sends snake_case JSON. Different events carry different fields.
#[derive(Debug, Deserialize)]
pub struct NotifyRequest {
    pub session_id: String,
    #[serde(alias = "hook_event_name")]
    pub hook_event: Option<String>,
    pub title: Option<String>,
    pub message: Option<String>,
    pub notification_type: Option<String>,
    pub agent_type: Option<String>,
    pub cwd: Option<String>,
    pub transcript_path: Option<String>,
}

/// POST /notify — receive a notification from a Claude Code hook.
/// Stores raw hook data as-is. Formatting is done by the Tauri notification poller.
pub async fn notify(
    State(state): State<AppState>,
    Json(payload): Json<NotifyRequest>,
) -> impl IntoResponse {
    let hook_event = payload
        .hook_event
        .unwrap_or_else(|| "Unknown".to_string());

    let notif = NewNotification {
        session_id: payload.session_id,
        hook_event: hook_event.clone(),
        notification_type: payload.notification_type,
        title: payload.title,
        message: payload.message,
        agent_type: payload.agent_type,
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
