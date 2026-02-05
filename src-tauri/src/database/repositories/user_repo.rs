use anyhow::Result;
use sqlx::{QueryBuilder, SqlitePool};
use uuid::Uuid;

use crate::database::entities::{CreateUserDto, UpdateUserDto, User, UserRow};

pub struct UserRepository;

impl UserRepository {
    /// Get all users
    pub async fn find_all(pool: &SqlitePool) -> Result<Vec<User>> {
        let rows = sqlx::query_as::<_, UserRow>(
            r#"
            SELECT id, name, email, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(pool)
        .await?;

        let users: Result<Vec<User>, _> = rows
            .into_iter()
            .map(|row| row.try_into())
            .collect();

        users
    }

    /// Get a user by ID
    pub async fn find_by_id(pool: &SqlitePool, id: &str) -> Result<Option<User>> {
        let row = sqlx::query_as::<_, UserRow>(
            r#"
            SELECT id, name, email, created_at, updated_at
            FROM users
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        match row {
            Some(r) => Ok(Some(r.try_into()?)),
            None => Ok(None),
        }
    }

    /// Create a new user
    pub async fn create(pool: &SqlitePool, dto: CreateUserDto) -> Result<User> {
        let id = Uuid::new_v4().to_string();

        sqlx::query(
            r#"
            INSERT INTO users (id, name, email)
            VALUES (?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&dto.name)
        .bind(&dto.email)
        .execute(pool)
        .await?;

        // Fetch the created user
        let user = Self::find_by_id(pool, &id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Failed to fetch created user"))?;

        Ok(user)
    }

    /// Update a user (dynamic fields)
    pub async fn update(pool: &SqlitePool, dto: UpdateUserDto) -> Result<User> {
        let mut builder = QueryBuilder::new("UPDATE users SET ");
        let mut separated = builder.separated(", ");

        if let Some(name) = &dto.name {
            separated.push("name = ");
            separated.push_bind_unseparated(name);
        }

        if let Some(email) = &dto.email {
            separated.push("email = ");
            separated.push_bind_unseparated(email);
        }

        // Always update the updated_at timestamp
        separated.push("updated_at = CURRENT_TIMESTAMP");

        builder.push(" WHERE id = ");
        builder.push_bind(&dto.id);

        builder.build().execute(pool).await?;

        // Fetch the updated user
        let user = Self::find_by_id(pool, &dto.id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("User not found"))?;

        Ok(user)
    }

    /// Delete a user
    pub async fn delete(pool: &SqlitePool, id: &str) -> Result<()> {
        sqlx::query(
            r#"
            DELETE FROM users
            WHERE id = ?
            "#,
        )
        .bind(id)
        .execute(pool)
        .await?;

        Ok(())
    }
}
