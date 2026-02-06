//! Notification routes

use axum::{routing::post, Router};

use crate::handlers;
use crate::server::AppState;

/// Create notification routes
pub fn notify_routes() -> Router<AppState> {
    Router::new().route("/notify", post(handlers::notify))
}
