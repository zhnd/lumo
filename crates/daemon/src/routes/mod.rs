//! Route definitions
//!
//! Organizes routes by functionality.

mod health;
mod notify;
mod otlp;

pub use health::health_routes;
pub use notify::notify_routes;
pub use otlp::otlp_routes;
