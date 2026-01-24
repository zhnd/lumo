pub mod user_commands;

pub use user_commands::*;

/// Macro to generate the Tauri command handler with all registered commands
#[macro_export]
macro_rules! app_commands {
    () => {
        tauri::generate_handler![
            commands::get_all_users,
            commands::get_user_by_id,
            commands::create_user,
            commands::update_user,
            commands::delete_user,
        ]
    };
}
