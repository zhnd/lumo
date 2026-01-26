//! Stats service
//!
//! Business logic for statistics calculations and aggregations.

use anyhow::Result;
use chrono::{Datelike, Local, TimeZone};
use shared::SessionRepository;
use sqlx::SqlitePool;

use crate::types::{format_model_display_name, ModelStats, SummaryStats, TimeRange, TokenStats};

/// Service for statistics operations
pub struct StatsService;

impl StatsService {
    /// Get summary statistics for a time range
    pub async fn get_summary(pool: &SqlitePool, time_range: TimeRange) -> Result<SummaryStats> {
        let (start_time, end_time) = Self::get_time_range_bounds(time_range);
        let today_start = Self::get_today_start();

        // Get sessions in time range
        let sessions = SessionRepository::find_by_time_range(pool, start_time, end_time).await?;

        // Get today's sessions
        let today_sessions =
            SessionRepository::find_by_time_range(pool, today_start, end_time).await?;

        // Calculate totals
        let total_cost: f64 = sessions.iter().map(|s| s.total_cost_usd).sum();
        let total_tokens: i64 = sessions
            .iter()
            .map(|s| s.total_input_tokens + s.total_output_tokens)
            .sum();
        let cache_tokens: i64 = sessions.iter().map(|s| s.total_cache_read_tokens).sum();
        let active_time_seconds: i64 = sessions.iter().map(|s| s.duration_ms / 1000).sum();

        let cache_percentage = if total_tokens > 0 {
            (cache_tokens as f64 / total_tokens as f64) * 100.0
        } else {
            0.0
        };

        // Calculate cost change vs previous period
        let cost_change_percent = Self::calculate_cost_change(pool, time_range, total_cost).await?;

        // Get metric counters
        let metric_counters = Self::get_metric_counters(pool, start_time, end_time).await?;

        Ok(SummaryStats {
            total_cost: total_cost as f32,
            total_tokens: total_tokens as i32,
            cache_tokens: cache_tokens as i32,
            cache_percentage: cache_percentage as f32,
            active_time_seconds: active_time_seconds as i32,
            total_sessions: sessions.len() as i32,
            today_sessions: today_sessions.len() as i32,
            cost_change_percent: cost_change_percent as f32,
            lines_of_code_added: metric_counters.lines_added,
            lines_of_code_removed: metric_counters.lines_removed,
            pull_requests: metric_counters.pull_requests,
            commits: metric_counters.commits,
            code_edit_accepts: metric_counters.code_edit_accepts,
            code_edit_rejects: metric_counters.code_edit_rejects,
        })
    }

    /// Get model usage statistics for a time range
    pub async fn get_model_stats(
        pool: &SqlitePool,
        time_range: TimeRange,
    ) -> Result<Vec<ModelStats>> {
        let (start_time, end_time) = Self::get_time_range_bounds(time_range);

        // Query model stats from events
        let rows: Vec<ModelStatsRow> = sqlx::query_as(
            r#"
            SELECT
                COALESCE(model, 'unknown') as model,
                COALESCE(SUM(cost_usd), 0) as cost,
                COUNT(*) as requests,
                COALESCE(SUM(input_tokens + output_tokens), 0) as tokens
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND name = 'claude_code.api_request'
                AND model IS NOT NULL
            GROUP BY model
            ORDER BY cost DESC
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| ModelStats {
                display_name: format_model_display_name(&r.model),
                model: r.model,
                cost: r.cost as f32,
                requests: r.requests as i32,
                tokens: r.tokens as i32,
            })
            .collect())
    }

    /// Get token statistics by model for a time range
    pub async fn get_token_stats(
        pool: &SqlitePool,
        time_range: TimeRange,
    ) -> Result<Vec<TokenStats>> {
        let (start_time, end_time) = Self::get_time_range_bounds(time_range);

        let rows: Vec<TokenStatsRow> = sqlx::query_as(
            r#"
            SELECT
                COALESCE(model, 'unknown') as model,
                COALESCE(SUM(input_tokens), 0) as input,
                COALESCE(SUM(output_tokens), 0) as output,
                COALESCE(SUM(cache_read_tokens), 0) as cache_read,
                COALESCE(SUM(cache_creation_tokens), 0) as cache_creation
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND name = 'claude_code.api_request'
                AND model IS NOT NULL
            GROUP BY model
            ORDER BY (input + output) DESC
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| TokenStats {
                display_name: format_model_display_name(&r.model),
                model: r.model,
                input: r.input as i32,
                output: r.output as i32,
                cache_read: r.cache_read as i32,
                cache_creation: r.cache_creation as i32,
            })
            .collect())
    }

    /// Get time range start and end timestamps (in milliseconds)
    fn get_time_range_bounds(time_range: TimeRange) -> (i64, i64) {
        let now = Local::now();
        let end_time = now.timestamp_millis();

        let start = match time_range {
            TimeRange::Today => now.date_naive().and_hms_opt(0, 0, 0).unwrap(),
            TimeRange::Week => {
                let days_since_monday = now.weekday().num_days_from_monday() as i64;
                (now - chrono::Duration::days(days_since_monday))
                    .date_naive()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
            }
            TimeRange::Month => now
                .date_naive()
                .with_day(1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
        };

        let start_time = Local.from_local_datetime(&start).unwrap().timestamp_millis();
        (start_time, end_time)
    }

    /// Get today's start timestamp
    fn get_today_start() -> i64 {
        let now = Local::now();
        let start = now.date_naive().and_hms_opt(0, 0, 0).unwrap();
        Local.from_local_datetime(&start).unwrap().timestamp_millis()
    }

    /// Get metric counters from the metrics table
    async fn get_metric_counters(
        pool: &SqlitePool,
        start_time: i64,
        end_time: i64,
    ) -> Result<MetricCounters> {
        // Query lines of code
        let lines_row: Option<LinesOfCodeRow> = sqlx::query_as(
            r#"
            SELECT
                COALESCE(SUM(CASE WHEN metric_type = 'added' THEN value ELSE 0.0 END), 0.0) as added,
                COALESCE(SUM(CASE WHEN metric_type = 'removed' THEN value ELSE 0.0 END), 0.0) as removed
            FROM metrics
            WHERE name = 'claude_code.lines_of_code.count'
                AND timestamp >= ? AND timestamp <= ?
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_optional(pool)
        .await?;

        // Query pull requests
        let pr_count: Option<CountRow> = sqlx::query_as(
            r#"
            SELECT COALESCE(SUM(value), 0.0) as count
            FROM metrics
            WHERE name = 'claude_code.pull_request.count'
                AND timestamp >= ? AND timestamp <= ?
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_optional(pool)
        .await?;

        // Query commits
        let commit_count: Option<CountRow> = sqlx::query_as(
            r#"
            SELECT COALESCE(SUM(value), 0.0) as count
            FROM metrics
            WHERE name = 'claude_code.commit.count'
                AND timestamp >= ? AND timestamp <= ?
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_optional(pool)
        .await?;

        // Query code edit tool decisions
        let code_edit_row: Option<DecisionRow> = sqlx::query_as(
            r#"
            SELECT
                COALESCE(SUM(CASE WHEN decision = 'accept' THEN value ELSE 0.0 END), 0.0) as accepts,
                COALESCE(SUM(CASE WHEN decision = 'reject' THEN value ELSE 0.0 END), 0.0) as rejects
            FROM metrics
            WHERE name = 'claude_code.code_edit_tool.decision'
                AND timestamp >= ? AND timestamp <= ?
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_optional(pool)
        .await?;

        Ok(MetricCounters {
            lines_added: lines_row.as_ref().map(|r| r.added as i32).unwrap_or(0),
            lines_removed: lines_row.as_ref().map(|r| r.removed as i32).unwrap_or(0),
            pull_requests: pr_count.as_ref().map(|r| r.count as i32).unwrap_or(0),
            commits: commit_count.as_ref().map(|r| r.count as i32).unwrap_or(0),
            code_edit_accepts: code_edit_row.as_ref().map(|r| r.accepts as i32).unwrap_or(0),
            code_edit_rejects: code_edit_row.as_ref().map(|r| r.rejects as i32).unwrap_or(0),
        })
    }

    /// Calculate cost change percentage vs previous period
    async fn calculate_cost_change(
        pool: &SqlitePool,
        time_range: TimeRange,
        current_cost: f64,
    ) -> Result<f64> {
        let (start_time, _) = Self::get_time_range_bounds(time_range);

        // Calculate previous period bounds
        let duration_ms = match time_range {
            TimeRange::Today => 24 * 60 * 60 * 1000,
            TimeRange::Week => 7 * 24 * 60 * 60 * 1000,
            TimeRange::Month => 30 * 24 * 60 * 60 * 1000,
        };
        let prev_start = start_time - duration_ms;
        let prev_end = start_time;

        let prev_sessions =
            SessionRepository::find_by_time_range(pool, prev_start, prev_end).await?;
        let prev_cost: f64 = prev_sessions.iter().map(|s| s.total_cost_usd).sum();

        if prev_cost > 0.0 {
            Ok(((current_cost - prev_cost) / prev_cost) * 100.0)
        } else {
            Ok(0.0)
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct ModelStatsRow {
    model: String,
    cost: f64,
    requests: i64,
    tokens: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct TokenStatsRow {
    model: String,
    input: i64,
    output: i64,
    cache_read: i64,
    cache_creation: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct LinesOfCodeRow {
    added: f64,
    removed: f64,
}

#[derive(Debug, sqlx::FromRow)]
struct CountRow {
    count: f64,
}

#[derive(Debug, sqlx::FromRow)]
struct DecisionRow {
    accepts: f64,
    rejects: f64,
}

#[derive(Debug, Default)]
struct MetricCounters {
    lines_added: i32,
    lines_removed: i32,
    pull_requests: i32,
    commits: i32,
    code_edit_accepts: i32,
    code_edit_rejects: i32,
}
