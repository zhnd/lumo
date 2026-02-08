//! Tools service
//!
//! Business logic for tool usage analysis.

use std::collections::{HashMap, HashSet};

use anyhow::Result;
use sqlx::SqlitePool;

use super::time_range::{generate_date_labels, get_time_range_bounds};
use crate::types::{CodeEditLanguageStats, TimeRange, ToolTrend, ToolUsageStats};

/// Service for tool analysis operations
pub struct ToolsService;

impl ToolsService {
    /// Get tool usage statistics (frequency, success rate, avg duration)
    pub async fn get_tool_usage_stats(
        pool: &SqlitePool,
        time_range: TimeRange,
    ) -> Result<Vec<ToolUsageStats>> {
        let (start_time, end_time) = get_time_range_bounds(time_range);

        let rows: Vec<ToolUsageRow> = sqlx::query_as(
            r#"
            SELECT
                COALESCE(tool_name, 'unknown') as tool_name,
                COUNT(*) as count,
                COALESCE(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END), 0) as successes,
                COALESCE(SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END), 0) as failures,
                AVG(duration_ms) as avg_duration_ms
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND name = 'claude_code.tool_result'
                AND tool_name IS NOT NULL
            GROUP BY tool_name
            ORDER BY count DESC
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| ToolUsageStats {
                tool_name: r.tool_name,
                count: r.count as i32,
                successes: r.successes as i32,
                failures: r.failures as i32,
                avg_duration_ms: r.avg_duration_ms.map(|v| v as f32),
            })
            .collect())
    }

    /// Get code edit decisions grouped by language
    pub async fn get_code_edit_by_language(
        pool: &SqlitePool,
        time_range: TimeRange,
    ) -> Result<Vec<CodeEditLanguageStats>> {
        let (start_time, end_time) = get_time_range_bounds(time_range);

        let rows: Vec<CodeEditLangRow> = sqlx::query_as(
            r#"
            SELECT
                COALESCE(language, 'unknown') as language,
                COALESCE(SUM(CASE WHEN decision = 'accept' THEN value ELSE 0.0 END), 0.0) as accepts,
                COALESCE(SUM(CASE WHEN decision = 'reject' THEN value ELSE 0.0 END), 0.0) as rejects
            FROM metrics
            WHERE name = 'claude_code.code_edit_tool.decision'
                AND timestamp >= ? AND timestamp <= ?
            GROUP BY language
            ORDER BY (accepts + rejects) DESC
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| CodeEditLanguageStats {
                language: r.language,
                accepts: r.accepts as i32,
                rejects: r.rejects as i32,
            })
            .collect())
    }

    /// Get tool usage trends (top 5 tools, daily counts)
    pub async fn get_tool_trends(
        pool: &SqlitePool,
        time_range: TimeRange,
    ) -> Result<Vec<ToolTrend>> {
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
                COALESCE(tool_name, 'unknown') as tool_name,
                strftime('{}', datetime(timestamp / 1000, 'unixepoch', 'localtime')) as date,
                COUNT(*) as count
            FROM events
            WHERE timestamp >= ? AND timestamp <= ?
                AND name = 'claude_code.tool_result'
                AND tool_name IN (
                    SELECT tool_name FROM events
                    WHERE timestamp >= ? AND timestamp <= ?
                        AND name = 'claude_code.tool_result'
                        AND tool_name IS NOT NULL
                    GROUP BY tool_name
                    ORDER BY COUNT(*) DESC
                    LIMIT 5
                )
            GROUP BY tool_name, {}
            ORDER BY date ASC, count DESC
            "#,
            format_str, group_expr
        );

        let rows: Vec<ToolTrendRow> = sqlx::query_as(&query)
        .bind(start_time)
        .bind(end_time)
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await?;

        let tools: HashSet<String> = rows.iter().map(|r| r.tool_name.clone()).collect();
        let mut tools: Vec<String> = tools.into_iter().collect();
        tools.sort();
        let mut count_map: HashMap<(String, String), i32> = HashMap::new();
        for r in rows {
            count_map.insert((r.tool_name, r.date), r.count as i32);
        }

        let all_labels = generate_date_labels(time_range);
        let mut result = Vec::new();
        for label in &all_labels {
            for tool in &tools {
                let count = count_map
                    .get(&(tool.clone(), label.clone()))
                    .copied()
                    .unwrap_or(0);
                result.push(ToolTrend {
                    tool_name: tool.clone(),
                    date: label.clone(),
                    count,
                });
            }
        }

        Ok(result)
    }
}

#[derive(Debug, sqlx::FromRow)]
struct ToolUsageRow {
    tool_name: String,
    count: i64,
    successes: i64,
    failures: i64,
    avg_duration_ms: Option<f64>,
}

#[derive(Debug, sqlx::FromRow)]
struct CodeEditLangRow {
    language: String,
    accepts: f64,
    rejects: f64,
}

#[derive(Debug, sqlx::FromRow)]
struct ToolTrendRow {
    tool_name: String,
    date: String,
    count: i64,
}
