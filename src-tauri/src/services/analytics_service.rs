//! Analytics service
//!
//! Business logic for analytics insights and deep analysis.

use anyhow::Result;
use chrono::{Datelike, Local, TimeZone};
use sqlx::SqlitePool;

use crate::types::{ActivityDay, ErrorRateStats, HourlyActivity, SessionBucket, TimeRange};

/// Service for analytics operations
pub struct AnalyticsService;

impl AnalyticsService {
    /// Get hourly activity distribution (API requests per hour of day)
    pub async fn get_hourly_activity(
        pool: &SqlitePool,
        time_range: TimeRange,
    ) -> Result<Vec<HourlyActivity>> {
        let (start_time, end_time) = Self::get_time_range_bounds(time_range);

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
        for i in 0..24 {
            result[i].hour = i as i32;
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
        let (start_time, end_time) = Self::get_time_range_bounds(time_range);

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
        let (start_time, end_time) = Self::get_time_range_bounds(time_range);

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
