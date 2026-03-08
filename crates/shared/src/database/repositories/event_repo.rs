//! Event repository
//!
//! Provides CRUD operations for events.

use sqlx::{Sqlite, SqlitePool};

use crate::database::entities::{Event, EventRow, NewEvent};
use crate::error::Result;

/// Repository for event operations
pub struct EventRepository;

impl EventRepository {
    /// Insert a new event into any executor (pool or transaction)
    pub async fn insert<'e, E>(executor: E, event: &NewEvent) -> Result<()>
    where
        E: sqlx::Executor<'e, Database = Sqlite>,
    {
        sqlx::query(
            r#"
            INSERT INTO events (
                id, session_id, name, timestamp,
                duration_ms, success, error,
                model, cost_usd, input_tokens, output_tokens,
                cache_read_tokens, cache_creation_tokens, status_code, attempt,
                tool_name, tool_decision, decision_source, tool_parameters,
                prompt_length, prompt,
                account_uuid, organization_id, terminal_type, app_version,
                resource,
                user_id, user_email, event_sequence, tool_result_size_bytes
            ) VALUES (
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?,
                ?, ?, ?, ?,
                ?,
                ?, ?, ?, ?
            )
            "#,
        )
        .bind(&event.id)
        .bind(&event.session_id)
        .bind(&event.name)
        .bind(event.timestamp)
        .bind(event.duration_ms)
        .bind(event.success.map(|b| if b { 1 } else { 0 }))
        .bind(&event.error)
        .bind(&event.model)
        .bind(event.cost_usd)
        .bind(event.input_tokens)
        .bind(event.output_tokens)
        .bind(event.cache_read_tokens)
        .bind(event.cache_creation_tokens)
        .bind(event.status_code)
        .bind(event.attempt)
        .bind(&event.tool_name)
        .bind(&event.tool_decision)
        .bind(&event.decision_source)
        .bind(&event.tool_parameters)
        .bind(event.prompt_length)
        .bind(&event.prompt)
        .bind(&event.account_uuid)
        .bind(&event.organization_id)
        .bind(&event.terminal_type)
        .bind(&event.app_version)
        .bind(&event.resource)
        .bind(&event.user_id)
        .bind(&event.user_email)
        .bind(event.event_sequence)
        .bind(event.tool_result_size_bytes)
        .execute(executor)
        .await?;

        Ok(())
    }

    /// Insert multiple events in a batch using a single transaction
    pub async fn insert_batch(pool: &SqlitePool, events: &[NewEvent]) -> Result<()> {
        if events.is_empty() {
            return Ok(());
        }

        let mut tx = pool.begin().await?;

        for event in events {
            Self::insert(&mut *tx, event).await?;
        }

        tx.commit().await?;
        Ok(())
    }

    /// Find all events for a session
    pub async fn find_by_session(pool: &SqlitePool, session_id: &str) -> Result<Vec<Event>> {
        let rows: Vec<EventRow> = sqlx::query_as(
            r#"
            SELECT * FROM events
            WHERE session_id = ?
            ORDER BY timestamp ASC
            "#,
        )
        .bind(session_id)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(Event::from).collect())
    }

    /// Find events by name
    pub async fn find_by_name(pool: &SqlitePool, name: &str) -> Result<Vec<Event>> {
        let rows: Vec<EventRow> = sqlx::query_as(
            r#"
            SELECT * FROM events
            WHERE name = ?
            ORDER BY timestamp DESC
            "#,
        )
        .bind(name)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(Event::from).collect())
    }

    /// Find events within a time range
    pub async fn find_by_time_range(
        pool: &SqlitePool,
        start_time: i64,
        end_time: i64,
    ) -> Result<Vec<Event>> {
        let rows: Vec<EventRow> = sqlx::query_as(
            r#"
            SELECT * FROM events
            WHERE timestamp >= ? AND timestamp <= ?
            ORDER BY timestamp ASC
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(Event::from).collect())
    }

    /// Find API request events for a session
    pub async fn find_api_requests(pool: &SqlitePool, session_id: &str) -> Result<Vec<Event>> {
        let rows: Vec<EventRow> = sqlx::query_as(
            r#"
            SELECT * FROM events
            WHERE session_id = ? AND name = 'claude_code.api_request'
            ORDER BY timestamp ASC
            "#,
        )
        .bind(session_id)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(Event::from).collect())
    }

    /// Find tool result events for a session
    pub async fn find_tool_results(pool: &SqlitePool, session_id: &str) -> Result<Vec<Event>> {
        let rows: Vec<EventRow> = sqlx::query_as(
            r#"
            SELECT * FROM events
            WHERE session_id = ? AND name = 'claude_code.tool_result'
            ORDER BY timestamp ASC
            "#,
        )
        .bind(session_id)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(Event::from).collect())
    }

    /// Find error events for a session
    pub async fn find_errors(pool: &SqlitePool, session_id: &str) -> Result<Vec<Event>> {
        let rows: Vec<EventRow> = sqlx::query_as(
            r#"
            SELECT * FROM events
            WHERE session_id = ? AND name = 'claude_code.api_error'
            ORDER BY timestamp ASC
            "#,
        )
        .bind(session_id)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(Event::from).collect())
    }

    /// Get recent events with pagination
    pub async fn find_recent(
        pool: &SqlitePool,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Event>> {
        let rows: Vec<EventRow> = sqlx::query_as(
            r#"
            SELECT * FROM events
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(Event::from).collect())
    }

    /// Delete events older than a given timestamp
    pub async fn delete_before(pool: &SqlitePool, timestamp: i64) -> Result<u64> {
        let result = sqlx::query(
            r#"
            DELETE FROM events WHERE timestamp < ?
            "#,
        )
        .bind(timestamp)
        .execute(pool)
        .await?;

        Ok(result.rows_affected())
    }
}
