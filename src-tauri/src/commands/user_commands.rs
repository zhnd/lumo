use sqlx::SqlitePool;
use tauri::{command, AppHandle, Manager};

use crate::database::{
    entities::{CreateUserDto, UpdateUserDto, User},
    repositories::UserRepository,
};

/// Get all users
#[command]
pub async fn get_all_users(app_handle: AppHandle) -> Result<Vec<User>, String> {
    let pool = app_handle.state::<SqlitePool>();
    UserRepository::find_all(&pool)
        .await
        .map_err(|e| e.to_string())
}

/// Get a user by ID
#[command]
pub async fn get_user_by_id(app_handle: AppHandle, id: String) -> Result<Option<User>, String> {
    let pool = app_handle.state::<SqlitePool>();
    UserRepository::find_by_id(&pool, &id)
        .await
        .map_err(|e| e.to_string())
}

/// Create a new user
#[command]
pub async fn create_user(app_handle: AppHandle, dto: CreateUserDto) -> Result<User, String> {
    let pool = app_handle.state::<SqlitePool>();
    UserRepository::create(&pool, dto)
        .await
        .map_err(|e| e.to_string())
}

/// Update a user
#[command]
pub async fn update_user(app_handle: AppHandle, dto: UpdateUserDto) -> Result<User, String> {
    let pool = app_handle.state::<SqlitePool>();
    UserRepository::update(&pool, dto)
        .await
        .map_err(|e| e.to_string())
}

/// Delete a user
#[command]
pub async fn delete_user(app_handle: AppHandle, id: String) -> Result<(), String> {
    let pool = app_handle.state::<SqlitePool>();
    UserRepository::delete(&pool, &id)
        .await
        .map_err(|e| e.to_string())
}
