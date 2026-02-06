//! Application router setup

use axum::Router;
use tower_http::trace::TraceLayer;

use crate::routes;
use crate::server::AppState;

/// Create the Axum application router
pub fn create_app(state: AppState) -> Router {
    Router::new()
        .merge(routes::health_routes())
        .merge(routes::otlp_routes())
        .merge(routes::notify_routes())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
