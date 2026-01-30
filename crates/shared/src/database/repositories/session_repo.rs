//! Session repository
//!
//! Provides read operations for sessions (from the sessions view).

use sqlx::SqlitePool;

use crate::database::entities::Session;
use crate::error::{Error, Result};

/// Repository for session operations
pub struct SessionRepository;

impl SessionRepository {
    /// Find all sessions ordered by start time (most recent first)
    pub async fn find_all(pool: &SqlitePool) -> Result<Vec<Session>> {
        let sessions: Vec<Session> = sqlx::query_as(
            r#"
            SELECT * FROM sessions
            ORDER BY start_time DESC
            "#,
        )
        .fetch_all(pool)
        .await?;

        Ok(sessions)
    }

    /// Find sessions with pagination
    pub async fn find_paginated(
        pool: &SqlitePool,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Session>> {
        let sessions: Vec<Session> = sqlx::query_as(
            r#"
            SELECT * FROM sessions
            ORDER BY start_time DESC
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(sessions)
    }

    /// Find a session by ID
    pub async fn find_by_id(pool: &SqlitePool, id: &str) -> Result<Session> {
        let session: Option<Session> = sqlx::query_as(
            r#"
            SELECT * FROM sessions
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        session.ok_or_else(|| Error::NotFound(format!("Session not found: {}", id)))
    }

    /// Find sessions within a time range
    pub async fn find_by_time_range(
        pool: &SqlitePool,
        start_time: i64,
        end_time: i64,
    ) -> Result<Vec<Session>> {
        let sessions: Vec<Session> = sqlx::query_as(
            r#"
            SELECT * FROM sessions
            WHERE start_time <= ? AND end_time >= ?
            ORDER BY start_time DESC
            "#,
        )
        .bind(end_time)
        .bind(start_time)
        .fetch_all(pool)
        .await?;

        Ok(sessions)
    }

    /// Count total number of sessions
    pub async fn count(pool: &SqlitePool) -> Result<i64> {
        let (count,): (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*) FROM sessions
            "#,
        )
        .fetch_one(pool)
        .await?;

        Ok(count)
    }

    /// Get total cost across all sessions
    pub async fn get_total_cost(pool: &SqlitePool) -> Result<f64> {
        let (total,): (f64,) = sqlx::query_as(
            r#"
            SELECT COALESCE(SUM(total_cost_usd), 0) FROM sessions
            "#,
        )
        .fetch_one(pool)
        .await?;

        Ok(total)
    }

    /// Get total tokens across all sessions
    pub async fn get_total_tokens(pool: &SqlitePool) -> Result<TotalTokens> {
        let row: TotalTokensRow = sqlx::query_as(
            r#"
            SELECT
                COALESCE(SUM(total_input_tokens), 0) as input_tokens,
                COALESCE(SUM(total_output_tokens), 0) as output_tokens,
                COALESCE(SUM(total_cache_read_tokens), 0) as cache_read_tokens
            FROM sessions
            "#,
        )
        .fetch_one(pool)
        .await?;

        Ok(TotalTokens::from(row))
    }

    /// Get sessions summary statistics
    pub async fn get_summary(pool: &SqlitePool) -> Result<SessionsSummary> {
        let row: SessionsSummaryRow = sqlx::query_as(
            r#"
            SELECT
                COUNT(*) as session_count,
                COALESCE(SUM(total_cost_usd), 0) as total_cost_usd,
                COALESCE(SUM(total_input_tokens), 0) as total_input_tokens,
                COALESCE(SUM(total_output_tokens), 0) as total_output_tokens,
                COALESCE(SUM(api_request_count), 0) as total_api_requests,
                COALESCE(SUM(error_count), 0) as total_errors,
                COALESCE(SUM(tool_use_count), 0) as total_tool_uses
            FROM sessions
            "#,
        )
        .fetch_one(pool)
        .await?;

        Ok(SessionsSummary::from(row))
    }
}

/// Total tokens across all sessions
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TotalTokens {
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cache_read_tokens: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct TotalTokensRow {
    input_tokens: i64,
    output_tokens: i64,
    cache_read_tokens: i64,
}

impl From<TotalTokensRow> for TotalTokens {
    fn from(row: TotalTokensRow) -> Self {
        Self {
            input_tokens: row.input_tokens,
            output_tokens: row.output_tokens,
            cache_read_tokens: row.cache_read_tokens,
        }
    }
}

/// Sessions summary statistics
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionsSummary {
    pub session_count: i64,
    pub total_cost_usd: f64,
    pub total_input_tokens: i64,
    pub total_output_tokens: i64,
    pub total_api_requests: i64,
    pub total_errors: i64,
    pub total_tool_uses: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct SessionsSummaryRow {
    session_count: i64,
    total_cost_usd: f64,
    total_input_tokens: i64,
    total_output_tokens: i64,
    total_api_requests: i64,
    total_errors: i64,
    total_tool_uses: i64,
}

impl From<SessionsSummaryRow> for SessionsSummary {
    fn from(row: SessionsSummaryRow) -> Self {
        Self {
            session_count: row.session_count,
            total_cost_usd: row.total_cost_usd,
            total_input_tokens: row.total_input_tokens,
            total_output_tokens: row.total_output_tokens,
            total_api_requests: row.total_api_requests,
            total_errors: row.total_errors,
            total_tool_uses: row.total_tool_uses,
        }
    }
}
