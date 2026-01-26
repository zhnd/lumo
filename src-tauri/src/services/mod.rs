//! Business services
//!
//! These services contain business logic, data aggregation, and calculations.

mod stats_service;
mod trends_service;

pub use stats_service::StatsService;
pub use trends_service::TrendsService;
