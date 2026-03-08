//! Metric repository
//!
//! Provides CRUD operations for metrics.

use sqlx::{Sqlite, SqlitePool};

use crate::database::entities::{Metric, MetricRow, NewMetric};
use crate::error::Result;

/// Repository for metric operations
pub struct MetricRepository;

impl MetricRepository {
    /// Insert a new metric into any executor (pool or transaction)
    pub async fn insert<'e, E>(executor: E, metric: &NewMetric) -> Result<()>
    where
        E: sqlx::Executor<'e, Database = Sqlite>,
    {
        sqlx::query(
            r#"
            INSERT INTO metrics (
                id, session_id, name, timestamp, value,
                metric_type, model, tool, decision, language,
                account_uuid, organization_id, terminal_type, app_version,
                resource,
                user_id, user_email, unit, description
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?,
                ?, ?, ?, ?
            )
            "#,
        )
        .bind(&metric.id)
        .bind(&metric.session_id)
        .bind(&metric.name)
        .bind(metric.timestamp)
        .bind(metric.value)
        .bind(&metric.metric_type)
        .bind(&metric.model)
        .bind(&metric.tool)
        .bind(&metric.decision)
        .bind(&metric.language)
        .bind(&metric.account_uuid)
        .bind(&metric.organization_id)
        .bind(&metric.terminal_type)
        .bind(&metric.app_version)
        .bind(&metric.resource)
        .bind(&metric.user_id)
        .bind(&metric.user_email)
        .bind(&metric.unit)
        .bind(&metric.description)
        .execute(executor)
        .await?;

        Ok(())
    }

    /// Insert multiple metrics in a batch using a single transaction
    pub async fn insert_batch(pool: &SqlitePool, metrics: &[NewMetric]) -> Result<()> {
        if metrics.is_empty() {
            return Ok(());
        }

        let mut tx = pool.begin().await?;

        for metric in metrics {
            Self::insert(&mut *tx, metric).await?;
        }

        tx.commit().await?;
        Ok(())
    }

    /// Find all metrics for a session
    pub async fn find_by_session(pool: &SqlitePool, session_id: &str) -> Result<Vec<Metric>> {
        let rows: Vec<MetricRow> = sqlx::query_as(
            r#"
            SELECT * FROM metrics
            WHERE session_id = ?
            ORDER BY timestamp ASC
            "#,
        )
        .bind(session_id)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(Metric::from).collect())
    }

    /// Find metrics by name
    pub async fn find_by_name(pool: &SqlitePool, name: &str) -> Result<Vec<Metric>> {
        let rows: Vec<MetricRow> = sqlx::query_as(
            r#"
            SELECT * FROM metrics
            WHERE name = ?
            ORDER BY timestamp DESC
            "#,
        )
        .bind(name)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(Metric::from).collect())
    }

    /// Find metrics within a time range
    pub async fn find_by_time_range(
        pool: &SqlitePool,
        start_time: i64,
        end_time: i64,
    ) -> Result<Vec<Metric>> {
        let rows: Vec<MetricRow> = sqlx::query_as(
            r#"
            SELECT * FROM metrics
            WHERE timestamp >= ? AND timestamp <= ?
            ORDER BY timestamp ASC
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(Metric::from).collect())
    }

    /// Get aggregated token usage by model
    pub async fn get_token_usage_by_model(
        pool: &SqlitePool,
        session_id: Option<&str>,
    ) -> Result<Vec<TokenUsageByModel>> {
        let query = if session_id.is_some() {
            r#"
            SELECT
                model,
                metric_type,
                SUM(value) as total_tokens
            FROM metrics
            WHERE name = 'claude_code.token.usage'
              AND session_id = ?
              AND model IS NOT NULL
            GROUP BY model, metric_type
            ORDER BY model, metric_type
            "#
        } else {
            r#"
            SELECT
                model,
                metric_type,
                SUM(value) as total_tokens
            FROM metrics
            WHERE name = 'claude_code.token.usage'
              AND model IS NOT NULL
            GROUP BY model, metric_type
            ORDER BY model, metric_type
            "#
        };

        let rows: Vec<TokenUsageByModelRow> = if let Some(sid) = session_id {
            sqlx::query_as(query).bind(sid).fetch_all(pool).await?
        } else {
            sqlx::query_as(query).fetch_all(pool).await?
        };

        Ok(rows.into_iter().map(TokenUsageByModel::from).collect())
    }

    /// Delete metrics older than a given timestamp
    pub async fn delete_before(pool: &SqlitePool, timestamp: i64) -> Result<u64> {
        let result = sqlx::query(
            r#"
            DELETE FROM metrics WHERE timestamp < ?
            "#,
        )
        .bind(timestamp)
        .execute(pool)
        .await?;

        Ok(result.rows_affected())
    }
}

/// Token usage aggregated by model
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenUsageByModel {
    pub model: String,
    pub metric_type: String,
    pub total_tokens: f64,
}

#[derive(Debug, sqlx::FromRow)]
struct TokenUsageByModelRow {
    model: Option<String>,
    metric_type: Option<String>,
    total_tokens: f64,
}

impl From<TokenUsageByModelRow> for TokenUsageByModel {
    fn from(row: TokenUsageByModelRow) -> Self {
        Self {
            model: row.model.unwrap_or_default(),
            metric_type: row.metric_type.unwrap_or_default(),
            total_tokens: row.total_tokens,
        }
    }
}
