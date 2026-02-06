//! Trends service
//!
//! Business logic for usage trends and time series data.

use std::collections::{HashMap, HashSet};

use anyhow::Result;
use sqlx::SqlitePool;

use super::time_range::{generate_date_labels, get_time_range_bounds};
use crate::types::{CostByModelTrend, CostEfficiencyTrend, TimeRange, UsageTrend};

/// Service for trends operations
pub struct TrendsService;

impl TrendsService {
    /// Get usage trends for a time range
    pub async fn get_usage_trends(
        pool: &SqlitePool,
        time_range: TimeRange,
    ) -> Result<Vec<UsageTrend>> {
        let (start_time, end_time) = get_time_range_bounds(time_range);

        // Format string and grouping depends on time range
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
                COALESCE(SUM(cost_usd), 0) as cost,
                COALESCE(SUM(input_tokens), 0) as input_tokens,
                COALESCE(SUM(output_tokens), 0) as output_tokens,
                COALESCE(SUM(cache_read_tokens), 0) as cache_read_tokens,
                COALESCE(SUM(cache_creation_tokens), 0) as cache_creation_tokens
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

        let mut trend_map: HashMap<String, UsageTrend> = HashMap::new();
        for r in rows {
            trend_map.insert(
                r.date.clone(),
                UsageTrend {
                    date: r.date,
                    cost: r.cost as f32,
                    input_tokens: r.input_tokens as i32,
                    output_tokens: r.output_tokens as i32,
                    cache_read_tokens: r.cache_read_tokens as i32,
                    cache_creation_tokens: r.cache_creation_tokens as i32,
                },
            );
        }

        let all_labels = generate_date_labels(time_range);
        Ok(all_labels
            .into_iter()
            .map(|label| {
                trend_map.remove(&label).unwrap_or(UsageTrend {
                    date: label,
                    cost: 0.0,
                    input_tokens: 0,
                    output_tokens: 0,
                    cache_read_tokens: 0,
                    cache_creation_tokens: 0,
                })
            })
            .collect())
    }

    /// Get cost trends grouped by date and model
    pub async fn get_cost_by_model_trends(
        pool: &SqlitePool,
        time_range: TimeRange,
    ) -> Result<Vec<CostByModelTrend>> {
        let (start_time, end_time) = get_time_range_bounds(time_range);

        let format_str = match time_range {
            TimeRange::Today => "%H:00",
            TimeRange::Week | TimeRange::Month => "%Y-%m-%d",
        };

        let group_expr = match time_range {
            TimeRange::Today => {
                "strftime('%Y-%m-%d %H', datetime(timestamp / 1000, 'unixepoch', 'localtime'))"
            }
            TimeRange::Week | TimeRange::Month => {
                "strftime('%Y-%m-%d', datetime(timestamp / 1000, 'unixepoch', 'localtime'))"
            }
        };

        let query = format!(
            r#"
            SELECT
                strftime('{}', datetime(timestamp / 1000, 'unixepoch', 'localtime')) as date,
                COALESCE(model, 'unknown') as model,
                COALESCE(SUM(cost_usd), 0) as cost
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND name = 'claude_code.api_request'
            GROUP BY {}, model
            ORDER BY MIN(timestamp) ASC, model ASC
            "#,
            format_str, group_expr
        );

        let rows: Vec<CostByModelRow> = sqlx::query_as(&query)
            .bind(start_time)
            .bind(end_time)
            .fetch_all(pool)
            .await?;

        let models: HashSet<String> = rows.iter().map(|r| r.model.clone()).collect();
        let mut cost_map: HashMap<(String, String), f32> = HashMap::new();
        for r in rows {
            cost_map.insert((r.date, r.model), r.cost as f32);
        }

        let all_labels = generate_date_labels(time_range);
        let mut result = Vec::new();
        for label in &all_labels {
            for model in &models {
                let cost = cost_map
                    .get(&(label.clone(), model.clone()))
                    .copied()
                    .unwrap_or(0.0);
                result.push(CostByModelTrend {
                    date: label.clone(),
                    model: model.clone(),
                    cost,
                });
            }
        }

        Ok(result)
    }

    /// Get cost efficiency trend (cost per session over time)
    pub async fn get_cost_efficiency_trend(
        pool: &SqlitePool,
        time_range: TimeRange,
    ) -> Result<Vec<CostEfficiencyTrend>> {
        let (start_time, end_time) = get_time_range_bounds(time_range);

        let (format_str, group_expr) = match time_range {
            TimeRange::Today => (
                "%H:00",
                "strftime('%Y-%m-%d %H', datetime(start_time / 1000, 'unixepoch', 'localtime'))",
            ),
            TimeRange::Week | TimeRange::Month => (
                "%Y-%m-%d",
                "strftime('%Y-%m-%d', datetime(start_time / 1000, 'unixepoch', 'localtime'))",
            ),
        };

        let query = format!(
            r#"
            SELECT
                strftime('{}', datetime(start_time / 1000, 'unixepoch', 'localtime')) as date,
                COALESCE(SUM(total_cost_usd), 0) as total_cost,
                COUNT(*) as session_count
            FROM sessions
            WHERE start_time >= ? AND start_time <= ?
            GROUP BY {}
            ORDER BY MIN(start_time) ASC
            "#,
            format_str, group_expr
        );

        let rows: Vec<CostEfficiencyRow> = sqlx::query_as(&query)
            .bind(start_time)
            .bind(end_time)
            .fetch_all(pool)
            .await?;

        let mut trend_map: HashMap<String, CostEfficiencyTrend> = HashMap::new();
        for r in rows {
            let cost_per_session = if r.session_count > 0 {
                r.total_cost as f32 / r.session_count as f32
            } else {
                0.0
            };
            trend_map.insert(
                r.date.clone(),
                CostEfficiencyTrend {
                    date: r.date,
                    cost_per_session,
                    session_count: r.session_count as i32,
                },
            );
        }

        let all_labels = generate_date_labels(time_range);
        Ok(all_labels
            .into_iter()
            .map(|label| {
                trend_map
                    .remove(&label)
                    .unwrap_or(CostEfficiencyTrend {
                        date: label,
                        cost_per_session: 0.0,
                        session_count: 0,
                    })
            })
            .collect())
    }
}

#[derive(Debug, sqlx::FromRow)]
struct CostByModelRow {
    date: String,
    model: String,
    cost: f64,
}

#[derive(Debug, sqlx::FromRow)]
struct UsageTrendRow {
    date: String,
    cost: f64,
    input_tokens: i64,
    output_tokens: i64,
    cache_read_tokens: i64,
    cache_creation_tokens: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct CostEfficiencyRow {
    date: String,
    total_cost: f64,
    session_count: i64,
}
