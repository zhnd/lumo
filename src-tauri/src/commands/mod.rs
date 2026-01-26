pub mod session_commands;
pub mod stats_commands;
pub mod trends_commands;
pub mod user_commands;

pub use session_commands::*;
pub use stats_commands::*;
pub use trends_commands::*;
pub use user_commands::*;

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
        ]
    };
}
