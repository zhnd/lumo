//! Notification repository
//!
//! Provides CRUD operations for notifications.

use sqlx::SqlitePool;

use crate::database::entities::{NewNotification, Notification, NotificationRow};
use crate::error::Result;

/// Repository for notification operations
pub struct NotificationRepository;

impl NotificationRepository {
    /// Insert a new notification, returning its ID
    pub async fn insert(pool: &SqlitePool, notif: &NewNotification) -> Result<i64> {
        let result = sqlx::query(
            r#"
            INSERT INTO notifications (
                session_id, hook_event, notification_type,
                title, message, cwd, transcript_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&notif.session_id)
        .bind(&notif.hook_event)
        .bind(&notif.notification_type)
        .bind(&notif.title)
        .bind(&notif.message)
        .bind(&notif.cwd)
        .bind(&notif.transcript_path)
        .execute(pool)
        .await?;

        Ok(result.last_insert_rowid())
    }

    /// Find notifications that haven't been sent as OS notifications yet
    pub async fn find_unnotified(pool: &SqlitePool) -> Result<Vec<Notification>> {
        let rows: Vec<NotificationRow> = sqlx::query_as(
            r#"
            SELECT * FROM notifications
            WHERE notified = 0
            ORDER BY created_at ASC
            "#,
        )
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(Notification::from).collect())
    }

    /// Mark notifications as notified (OS notification sent)
    pub async fn mark_notified(pool: &SqlitePool, ids: &[i64]) -> Result<()> {
        if ids.is_empty() {
            return Ok(());
        }

        let placeholders: Vec<&str> = ids.iter().map(|_| "?").collect();
        let query = format!(
            "UPDATE notifications SET notified = 1 WHERE id IN ({})",
            placeholders.join(", ")
        );

        let mut q = sqlx::query(&query);
        for id in ids {
            q = q.bind(id);
        }
        q.execute(pool).await?;

        Ok(())
    }

    /// Mark a single notification as read
    pub async fn mark_read(pool: &SqlitePool, id: i64) -> Result<bool> {
        let result = sqlx::query(
            r#"
            UPDATE notifications SET read = 1 WHERE id = ?
            "#,
        )
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Mark all notifications as read
    pub async fn mark_all_read(pool: &SqlitePool) -> Result<u64> {
        let result = sqlx::query(
            r#"
            UPDATE notifications SET read = 1 WHERE read = 0
            "#,
        )
        .execute(pool)
        .await?;

        Ok(result.rows_affected())
    }

    /// Find recent notifications with pagination
    pub async fn find_recent(
        pool: &SqlitePool,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Notification>> {
        let rows: Vec<NotificationRow> = sqlx::query_as(
            r#"
            SELECT * FROM notifications
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(Notification::from).collect())
    }

    /// Get the count of unread notifications
    pub async fn unread_count(pool: &SqlitePool) -> Result<i64> {
        let row: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*) FROM notifications WHERE read = 0
            "#,
        )
        .fetch_one(pool)
        .await?;

        Ok(row.0)
    }
}
