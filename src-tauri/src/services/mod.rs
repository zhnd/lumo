//! Business services
//!
//! These services contain business logic, data aggregation, and calculations.

mod analytics_service;
mod claude_config_service;
mod claude_session_service;
pub mod notification_poller;
mod notification_settings_service;
pub mod session_cache;
pub mod session_watcher;
mod stats_service;
mod claude_cli_probe;
mod claude_credentials;
mod insights_service;
mod interactive_runner;
mod subscription_usage_service;
mod terminal_renderer;
pub mod time_range;
mod tools_service;
mod trends_service;
mod projects_service;
mod marketplace_service;
mod skills_service;
mod wrapped_service;

pub use analytics_service::AnalyticsService;
pub use claude_config_service::ClaudeConfigService;
pub use claude_session_service::ClaudeSessionService;
pub use notification_settings_service::NotificationSettingsService;
pub use stats_service::StatsService;
pub use insights_service::InsightsService;
pub use subscription_usage_service::SubscriptionUsageService;
pub use tools_service::ToolsService;
pub use trends_service::TrendsService;
pub use projects_service::ProjectsService;
pub use marketplace_service::MarketplaceService;
pub use skills_service::SkillsService;
pub use wrapped_service::WrappedService;
