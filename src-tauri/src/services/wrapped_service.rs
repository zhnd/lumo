//! Wrapped service
//!
//! Business logic for the personal report card (Wrapped) feature.

use anyhow::Result;
use chrono::{Datelike, Local, NaiveDate, TimeZone};
use sqlx::SqlitePool;

use crate::types::{format_model_display_name, WrappedData, WrappedPeriod};

/// Service for wrapped report operations
pub struct WrappedService;

impl WrappedService {
    /// Get all wrapped data for a period
    pub async fn get_wrapped_data(pool: &SqlitePool, period: WrappedPeriod) -> Result<WrappedData> {
        let (start_time, end_time) = Self::get_period_bounds(period);

        let session_stats = Self::get_session_stats(pool, start_time, end_time).await?;
        let active_seconds = Self::get_active_time_seconds(pool, start_time, end_time).await?;
        let output_stats = Self::get_output_stats(pool, start_time, end_time).await?;
        let (top_model, top_model_pct) = Self::get_top_model(pool, start_time, end_time).await?;
        let (top_tool, top_tool_count) = Self::get_top_tool(pool, start_time, end_time).await?;
        let longest_streak = Self::get_longest_streak(pool, start_time, end_time).await?;
        let (peak_hour, peak_hour_label) = Self::get_peak_hour(pool, start_time, end_time).await?;
        let cost_sparkline = Self::get_cost_sparkline(pool, start_time, end_time).await?;

        let active_days = cost_sparkline.iter().filter(|&&c| c > 0.0).count().max(1);
        let daily_avg_cost = session_stats.total_cost / active_days as f32;
        let cost_per_session = if session_stats.total_sessions > 0 {
            session_stats.total_cost / session_stats.total_sessions as f32
        } else {
            0.0
        };

        Ok(WrappedData {
            total_sessions: session_stats.total_sessions,
            total_active_hours: active_seconds as f32 / 3600.0,
            lines_of_code_added: output_stats.lines_added,
            lines_of_code_removed: output_stats.lines_removed,
            commits: output_stats.commits,
            total_cost: session_stats.total_cost,
            daily_avg_cost,
            cost_per_session,
            cost_sparkline,
            top_model,
            top_model_percentage: top_model_pct,
            top_tool,
            top_tool_count,
            longest_streak_days: longest_streak,
            peak_hour,
            peak_hour_label,
        })
    }

    async fn get_session_stats(
        pool: &SqlitePool,
        start_time: i64,
        end_time: i64,
    ) -> Result<SessionAgg> {
        // Use events table directly (consistent with overview/stats_service)
        let row: Option<SessionAggRow> = sqlx::query_as(
            r#"
            SELECT
                COUNT(DISTINCT session_id) as total_sessions,
                CAST(COALESCE(SUM(cost_usd), 0.0) AS REAL) as total_cost
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND name = 'claude_code.api_request'
                AND session_id != 'unknown'
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_optional(pool)
        .await?;

        Ok(row
            .map(|r| SessionAgg {
                total_sessions: r.total_sessions as i32,
                total_cost: r.total_cost as f32,
            })
            .unwrap_or_default())
    }

    /// Get active time in seconds from the `claude_code.active_time.total` OTEL metric.
    async fn get_active_time_seconds(
        pool: &SqlitePool,
        start_time: i64,
        end_time: i64,
    ) -> Result<f64> {
        let row: Option<(f64,)> = sqlx::query_as(
            r#"
            SELECT COALESCE(SUM(value), 0.0)
            FROM metrics
            WHERE name = 'claude_code.active_time.total'
              AND timestamp >= ? AND timestamp <= ?
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|r| r.0).unwrap_or(0.0))
    }

    /// Get output stats: lines of code changed and commits from metrics table.
    async fn get_output_stats(
        pool: &SqlitePool,
        start_time: i64,
        end_time: i64,
    ) -> Result<OutputStats> {
        let lines_row: Option<LinesRow> = sqlx::query_as(
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

        let commits: Option<(f64,)> = sqlx::query_as(
            r#"
            SELECT COALESCE(SUM(value), 0.0)
            FROM metrics
            WHERE name = 'claude_code.commit.count'
                AND timestamp >= ? AND timestamp <= ?
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_optional(pool)
        .await?;

        Ok(OutputStats {
            lines_added: lines_row.as_ref().map(|r| r.added as i32).unwrap_or(0),
            lines_removed: lines_row.as_ref().map(|r| r.removed as i32).unwrap_or(0),
            commits: commits.map(|r| r.0 as i32).unwrap_or(0),
        })
    }

    async fn get_top_model(
        pool: &SqlitePool,
        start_time: i64,
        end_time: i64,
    ) -> Result<(String, f32)> {
        let row: Option<TopModelRow> = sqlx::query_as(
            r#"
            SELECT
                COALESCE(model, 'unknown') as model,
                COUNT(*) as count
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND name = 'claude_code.api_request'
                AND model IS NOT NULL
            GROUP BY model
            ORDER BY count DESC
            LIMIT 1
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_optional(pool)
        .await?;

        let total: Option<(i64,)> = sqlx::query_as(
            r#"
            SELECT COUNT(*)
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND name = 'claude_code.api_request'
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_optional(pool)
        .await?;

        let total_count = total.map(|r| r.0).unwrap_or(1).max(1);

        match row {
            Some(r) => {
                let pct = (r.count as f32 / total_count as f32) * 100.0;
                Ok((format_model_display_name(&r.model), pct))
            }
            None => Ok(("Unknown".to_string(), 0.0)),
        }
    }

    async fn get_top_tool(
        pool: &SqlitePool,
        start_time: i64,
        end_time: i64,
    ) -> Result<(String, i32)> {
        let row: Option<TopToolRow> = sqlx::query_as(
            r#"
            SELECT
                COALESCE(tool_name, 'unknown') as tool_name,
                COUNT(*) as count
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND name = 'claude_code.tool_result'
                AND tool_name IS NOT NULL
            GROUP BY tool_name
            ORDER BY count DESC
            LIMIT 1
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_optional(pool)
        .await?;

        match row {
            Some(r) => Ok((r.tool_name, r.count as i32)),
            None => Ok(("None".to_string(), 0)),
        }
    }

    async fn get_longest_streak(pool: &SqlitePool, start_time: i64, end_time: i64) -> Result<i32> {
        let rows: Vec<DateRow> = sqlx::query_as(
            r#"
            SELECT DISTINCT
                strftime('%Y-%m-%d', datetime(timestamp / 1000, 'unixepoch', 'localtime')) as date
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
            ORDER BY date ASC
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await?;

        if rows.is_empty() {
            return Ok(0);
        }

        let dates: Vec<NaiveDate> = rows
            .iter()
            .filter_map(|r| NaiveDate::parse_from_str(&r.date, "%Y-%m-%d").ok())
            .collect();

        let mut max_streak = 1;
        let mut current_streak = 1;

        for i in 1..dates.len() {
            if dates[i].signed_duration_since(dates[i - 1]).num_days() == 1 {
                current_streak += 1;
                max_streak = max_streak.max(current_streak);
            } else {
                current_streak = 1;
            }
        }

        Ok(max_streak)
    }

    async fn get_peak_hour(
        pool: &SqlitePool,
        start_time: i64,
        end_time: i64,
    ) -> Result<(i32, String)> {
        let row: Option<HourRow> = sqlx::query_as(
            r#"
            SELECT
                CAST(strftime('%H', datetime(timestamp / 1000, 'unixepoch', 'localtime')) AS INTEGER) as hour,
                COUNT(*) as count
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND name = 'claude_code.api_request'
            GROUP BY hour
            ORDER BY count DESC
            LIMIT 1
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_optional(pool)
        .await?;

        match row {
            Some(r) => {
                let label = if r.hour >= 5 && r.hour < 12 {
                    format!("Early Bird — Peak at {:02}:00", r.hour)
                } else if r.hour >= 12 && r.hour < 18 {
                    format!("Afternoon Coder — Peak at {:02}:00", r.hour)
                } else if r.hour >= 18 && r.hour < 22 {
                    format!("Evening Warrior — Peak at {:02}:00", r.hour)
                } else {
                    format!("Night Owl — Peak at {:02}:00", r.hour)
                };
                Ok((r.hour as i32, label))
            }
            None => Ok((0, "No data".to_string())),
        }
    }

    async fn get_cost_sparkline(
        pool: &SqlitePool,
        start_time: i64,
        end_time: i64,
    ) -> Result<Vec<f32>> {
        let rows: Vec<DailyCostRow> = sqlx::query_as(
            r#"
            SELECT
                strftime('%Y-%m-%d', datetime(timestamp / 1000, 'unixepoch', 'localtime')) as date,
                COALESCE(SUM(cost_usd), 0.0) as cost
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND name = 'claude_code.api_request'
            GROUP BY date
            ORDER BY date ASC
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await?;

        if rows.is_empty() {
            return Ok(vec![]);
        }

        // Build a cost map from query results
        let cost_map: std::collections::HashMap<String, f32> = rows
            .into_iter()
            .map(|r| (r.date, r.cost as f32))
            .collect();

        // Fill all days from first to last with zeros for inactive days
        let first_date = cost_map
            .keys()
            .filter_map(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
            .min()
            .unwrap();
        let last_date = cost_map
            .keys()
            .filter_map(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
            .max()
            .unwrap();

        let mut sparkline = Vec::new();
        let mut current = first_date;
        while current <= last_date {
            let key = current.format("%Y-%m-%d").to_string();
            sparkline.push(*cost_map.get(&key).unwrap_or(&0.0));
            current += chrono::Duration::days(1);
        }

        Ok(sparkline)
    }

    fn get_period_bounds(period: WrappedPeriod) -> (i64, i64) {
        let now = Local::now();
        let end_time = now.timestamp_millis();

        let start = match period {
            WrappedPeriod::Today => now.date_naive().and_hms_opt(0, 0, 0).unwrap(),
            WrappedPeriod::Week => {
                let days_since_monday = now.weekday().num_days_from_monday() as i64;
                (now - chrono::Duration::days(days_since_monday))
                    .date_naive()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
            }
            WrappedPeriod::Month => now
                .date_naive()
                .with_day(1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            WrappedPeriod::All => NaiveDate::from_ymd_opt(2020, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
        };

        let start_time = Local
            .from_local_datetime(&start)
            .unwrap()
            .timestamp_millis();
        (start_time, end_time)
    }
}

// -- Internal row types --

#[derive(Debug, sqlx::FromRow)]
struct SessionAggRow {
    total_sessions: i64,
    total_cost: f64,
}

#[derive(Debug, Default)]
struct SessionAgg {
    total_sessions: i32,
    total_cost: f32,
}

#[derive(Debug, Default)]
struct OutputStats {
    lines_added: i32,
    lines_removed: i32,
    commits: i32,
}

#[derive(Debug, sqlx::FromRow)]
struct LinesRow {
    added: f64,
    removed: f64,
}

#[derive(Debug, sqlx::FromRow)]
struct TopModelRow {
    model: String,
    count: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct TopToolRow {
    tool_name: String,
    count: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct DateRow {
    date: String,
}

#[derive(Debug, sqlx::FromRow)]
struct HourRow {
    hour: i64,
    #[allow(dead_code)]
    count: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct DailyCostRow {
    #[allow(dead_code)]
    date: String,
    cost: f64,
}
