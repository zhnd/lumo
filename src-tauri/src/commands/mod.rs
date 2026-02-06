pub mod analytics_commands;
pub mod claude_session_commands;
pub mod daemon_commands;
pub mod export_commands;

pub mod session_commands;
pub mod stats_commands;
pub mod tools_commands;
pub mod trends_commands;
pub mod usage_commands;
pub mod user_commands;
pub mod wrapped_commands;

pub use analytics_commands::*;
pub use claude_session_commands::*;
pub use daemon_commands::*;
pub use export_commands::*;

pub use session_commands::*;
pub use stats_commands::*;
pub use tools_commands::*;
pub use trends_commands::*;
pub use usage_commands::*;
pub use user_commands::*;
pub use wrapped_commands::*;

/// Macro to generate the Tauri command handler with all registered commands
#[macro_export]
macro_rules! app_commands {
    () => {
        tauri::generate_handler![
            // User commands
            commands::get_all_users,
            commands::get_user_by_id,
            commands::create_user,
            commands::update_user,
            commands::delete_user,
            // Session commands
            commands::get_sessions,
            commands::get_session_by_id,
            // Stats commands
            commands::get_summary_stats,
            commands::get_model_stats,
            commands::get_token_stats,
            // Trends commands
            commands::get_usage_trends,
            commands::get_cost_by_model_trends,
            commands::get_cost_efficiency_trend,
            // Claude session commands
            commands::get_claude_sessions,
            commands::get_claude_sessions_for_project,
            commands::get_claude_session_detail,
            // Tools commands
            commands::get_tool_usage_stats,
            commands::get_code_edit_by_language,
            commands::get_tool_trends,
            // Analytics commands
            commands::get_hourly_activity,
            commands::get_session_length_distribution,
            commands::get_error_rate,
            commands::get_cache_hit_trend,
            commands::get_activity_heatmap,
            // Wrapped commands
            commands::get_wrapped_data,
            // Export commands
            commands::save_image_to_path,
            // Daemon commands
            commands::get_daemon_status,
            // Usage commands
            commands::get_usage_limits,
            commands::save_api_key,
            commands::has_api_key,
            commands::delete_api_key,
        ]
    };
}
