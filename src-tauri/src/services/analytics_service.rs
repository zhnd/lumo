//! Analytics service
//!
//! Business logic for analytics insights and deep analysis.

use std::collections::HashMap;

use anyhow::Result;
use chrono::{Local, TimeZone};
use sqlx::SqlitePool;

use super::time_range::{generate_date_labels, get_time_range_bounds};
use crate::types::{
    ActivityDay, CacheHitTrend, ErrorRateStats, HourlyActivity, SessionBucket, TimeRange,
};

/// Service for analytics operations
pub struct AnalyticsService;

impl AnalyticsService {
    /// Get hourly activity distribution (API requests per hour of day)
    pub async fn get_hourly_activity(
        pool: &SqlitePool,
        time_range: TimeRange,
    ) -> Result<Vec<HourlyActivity>> {
        let (start_time, end_time) = get_time_range_bounds(time_range);

        let rows: Vec<HourlyRow> = sqlx::query_as(
            r#"
            SELECT
                CAST(strftime('%H', datetime(timestamp / 1000, 'unixepoch', 'localtime')) AS INTEGER) as hour,
                COUNT(*) as count
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND name = 'claude_code.api_request'
            GROUP BY hour
            ORDER BY hour ASC
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await?;

        // Fill all 24 hours
        let mut result = vec![HourlyActivity { hour: 0, count: 0 }; 24];
        for (i, item) in result.iter_mut().enumerate().take(24) {
            item.hour = i as i32;
        }
        for r in rows {
            if (r.hour as usize) < 24 {
                result[r.hour as usize].count = r.count as i32;
            }
        }

        Ok(result)
    }

    /// Get session length distribution
    pub async fn get_session_length_distribution(
        pool: &SqlitePool,
        time_range: TimeRange,
    ) -> Result<Vec<SessionBucket>> {
        let (start_time, end_time) = get_time_range_bounds(time_range);

        let rows: Vec<BucketRow> = sqlx::query_as(
            r#"
            SELECT
                CASE
                    WHEN duration_ms < 300000 THEN '<5m'
                    WHEN duration_ms < 900000 THEN '5-15m'
                    WHEN duration_ms < 1800000 THEN '15-30m'
                    WHEN duration_ms < 3600000 THEN '30-60m'
                    ELSE '1h+'
                END as bucket,
                COUNT(*) as count
            FROM sessions
            WHERE start_time >= ? AND start_time <= ?
                AND id != 'unknown'
            GROUP BY bucket
            ORDER BY MIN(duration_ms) ASC
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await?;

        // Ensure all buckets exist
        let all_buckets = ["<5m", "5-15m", "15-30m", "30-60m", "1h+"];
        let mut result: Vec<SessionBucket> = all_buckets
            .iter()
            .map(|b| SessionBucket {
                bucket: b.to_string(),
                count: 0,
            })
            .collect();

        for r in rows {
            if let Some(item) = result.iter_mut().find(|b| b.bucket == r.bucket) {
                item.count = r.count as i32;
            }
        }

        Ok(result)
    }

    /// Get error rate statistics
    pub async fn get_error_rate(
        pool: &SqlitePool,
        time_range: TimeRange,
    ) -> Result<ErrorRateStats> {
        let (start_time, end_time) = get_time_range_bounds(time_range);

        let row: Option<ErrorRateRow> = sqlx::query_as(
            r#"
            SELECT
                COALESCE(SUM(CASE WHEN name = 'claude_code.api_request' THEN 1 ELSE 0 END), 0) as total_requests,
                COALESCE(SUM(CASE WHEN name = 'claude_code.api_error' THEN 1 ELSE 0 END), 0) as total_errors
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND name IN ('claude_code.api_request', 'claude_code.api_error')
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_optional(pool)
        .await?;

        let (total_requests, total_errors) = row
            .map(|r| (r.total_requests as i32, r.total_errors as i32))
            .unwrap_or((0, 0));

        let error_rate = if total_requests > 0 {
            total_errors as f32 / total_requests as f32
        } else {
            0.0
        };

        Ok(ErrorRateStats {
            total_requests,
            total_errors,
            error_rate,
        })
    }

    /// Get cache hit rate trend over time
    pub async fn get_cache_hit_trend(
        pool: &SqlitePool,
        time_range: TimeRange,
    ) -> Result<Vec<CacheHitTrend>> {
        let (start_time, end_time) = get_time_range_bounds(time_range);

        let (format_str, group_expr) = match time_range {
            TimeRange::Today => (
                "%H:00",
                "strftime('%Y-%m-%d %H', datetime(timestamp / 1000, 'unixepoch', 'localtime'))",
            ),
            TimeRange::Week | TimeRange::Month => (
                "%Y-%m-%d",
                "strftime('%Y-%m-%d', datetime(timestamp / 1000, 'unixepoch', 'localtime'))",
            ),
        };

        let query = format!(
            r#"
            SELECT
                strftime('{}', datetime(timestamp / 1000, 'unixepoch', 'localtime')) as date,
                COALESCE(
                    SUM(cache_read_tokens) * 100.0 / NULLIF(SUM(input_tokens + cache_read_tokens), 0),
                    0.0
                ) as rate
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND name = 'claude_code.api_request'
            GROUP BY {}
            ORDER BY MIN(timestamp) ASC
            "#,
            format_str, group_expr
        );

        let rows: Vec<CacheHitRow> = sqlx::query_as(&query)
            .bind(start_time)
            .bind(end_time)
            .fetch_all(pool)
            .await?;

        let mut trend_map: HashMap<String, f32> = HashMap::new();
        for r in rows {
            trend_map.insert(r.date, r.rate as f32);
        }

        let all_labels = generate_date_labels(time_range);
        Ok(all_labels
            .into_iter()
            .map(|label| {
                let rate = trend_map.remove(&label).unwrap_or(0.0);
                CacheHitTrend { date: label, rate }
            })
            .collect())
    }

    /// Get activity heatmap data (last 365 days, daily session counts)
    pub async fn get_activity_heatmap(pool: &SqlitePool) -> Result<Vec<ActivityDay>> {
        let now = Local::now();
        let start = (now - chrono::Duration::days(365))
            .date_naive()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        let start_time = Local
            .from_local_datetime(&start)
            .unwrap()
            .timestamp_millis();
        let end_time = now.timestamp_millis();

        let rows: Vec<ActivityDayRow> = sqlx::query_as(
            r#"
            SELECT
                strftime('%Y-%m-%d', datetime(timestamp / 1000, 'unixepoch', 'localtime')) as date,
                COUNT(DISTINCT session_id) as count
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND session_id != 'unknown'
            GROUP BY date
            ORDER BY date ASC
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| ActivityDay {
                date: r.date,
                count: r.count as i32,
            })
            .collect())
    }

}

#[derive(Debug, sqlx::FromRow)]
struct HourlyRow {
    hour: i64,
    count: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct BucketRow {
    bucket: String,
    count: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct ErrorRateRow {
    total_requests: i64,
    total_errors: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct ActivityDayRow {
    date: String,
    count: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct CacheHitRow {
    date: String,
    rate: f64,
}
