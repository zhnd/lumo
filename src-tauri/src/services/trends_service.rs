//! Trends service
//!
//! Business logic for usage trends and time series data.

use anyhow::Result;
use chrono::{Datelike, Local, TimeZone};
use sqlx::SqlitePool;

use crate::types::{TimeRange, UsageTrend};

/// Service for trends operations
pub struct TrendsService;

impl TrendsService {
    /// Get usage trends for a time range
    pub async fn get_usage_trends(
        pool: &SqlitePool,
        time_range: TimeRange,
    ) -> Result<Vec<UsageTrend>> {
        let (start_time, end_time) = Self::get_time_range_bounds(time_range);

        // Format string and grouping depends on time range
        let (format_str, group_expr) = match time_range {
            TimeRange::Today => (
                "%H:00",
                "strftime('%Y-%m-%d %H', datetime(timestamp / 1000, 'unixepoch', 'localtime'))",
            ),
            TimeRange::Week | TimeRange::Month => (
                "%a",
                "strftime('%Y-%m-%d', datetime(timestamp / 1000, 'unixepoch', 'localtime'))",
            ),
        };

        let query = format!(
            r#"
            SELECT
                strftime('{}', datetime(timestamp / 1000, 'unixepoch', 'localtime')) as date,
                COALESCE(SUM(cost_usd), 0) as cost,
                COALESCE(SUM(input_tokens), 0) as input_tokens,
                COALESCE(SUM(output_tokens), 0) as output_tokens,
                COALESCE(SUM(cache_read_tokens), 0) as cache_read_tokens
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND name = 'claude_code.api_request'
            GROUP BY {}
            ORDER BY MIN(timestamp) ASC
            "#,
            format_str, group_expr
        );

        let rows: Vec<UsageTrendRow> = sqlx::query_as(&query)
            .bind(start_time)
            .bind(end_time)
            .fetch_all(pool)
            .await?;

        Ok(rows
            .into_iter()
            .map(|r| UsageTrend {
                date: r.date,
                cost: r.cost as f32,
                input_tokens: r.input_tokens as i32,
                output_tokens: r.output_tokens as i32,
                cache_read_tokens: r.cache_read_tokens as i32,
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
}

#[derive(Debug, sqlx::FromRow)]
struct UsageTrendRow {
    date: String,
    cost: f64,
    input_tokens: i64,
    output_tokens: i64,
    cache_read_tokens: i64,
}
