pub mod analytics_commands;
pub mod claude_session_commands;
pub mod daemon_commands;
pub mod export_commands;
pub mod notification_settings_commands;
pub mod session_commands;
pub mod stats_commands;
pub mod subscription_usage_commands;
pub mod system_commands;
pub mod tools_commands;
pub mod trends_commands;
pub mod usage_commands;
pub mod user_commands;
pub mod projects_commands;
pub mod marketplace_commands;
pub mod skills_commands;
pub mod uninstall_commands;
pub mod wrapped_commands;

pub use analytics_commands::*;
pub use claude_session_commands::*;
pub use daemon_commands::*;
pub use export_commands::*;
pub use notification_settings_commands::*;
pub use session_commands::*;
pub use stats_commands::*;
pub use subscription_usage_commands::*;
pub use system_commands::*;
pub use tools_commands::*;
pub use trends_commands::*;
pub use usage_commands::*;
pub use user_commands::*;
pub use projects_commands::*;
pub use marketplace_commands::*;
pub use skills_commands::*;
pub use uninstall_commands::*;
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
            // Projects commands
            commands::get_projects,
            commands::get_global_skill_count,
            // Claude session commands
            commands::get_claude_sessions_page,
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
            // Subscription usage commands
            commands::fetch_subscription_usage,
            commands::show_claude_login,
            commands::hide_claude_login,
            commands::logout_claude,
            // Skills commands
            commands::list_skills,
            commands::get_skill_detail,
            commands::update_skill,
            commands::install_skill,
            commands::install_skill_from_source,
            commands::list_codex_skills,
            commands::uninstall_skill,
            commands::enable_skill,
            commands::disable_skill,
            commands::create_skill,
            // Marketplace commands
            commands::list_marketplace_plugins,
            commands::list_marketplaces,
            commands::install_marketplace_plugin,
            commands::uninstall_marketplace_plugin,
            commands::add_marketplace,
            commands::remove_marketplace,
            commands::update_marketplaces,
            // Notification settings commands
            commands::get_notification_settings,
            commands::update_notification_setting,
            commands::get_terminal_notif_channel,
            commands::set_terminal_notif_channel,
            // Uninstall commands
            commands::uninstall_app,
            // System commands
            commands::open_log_directory,
        ]
    };
}
