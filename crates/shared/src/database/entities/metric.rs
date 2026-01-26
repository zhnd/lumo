//! Metric entity
//!
//! Represents OTLP metrics from Claude Code.

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Database row representation of a metric
#[derive(Debug, Clone, FromRow)]
pub struct MetricRow {
    pub id: String,
    pub session_id: String,
    pub name: String,
    pub timestamp: i64,
    pub value: f64,
    pub metric_type: Option<String>,
    pub model: Option<String>,
    pub tool: Option<String>,
    pub decision: Option<String>,
    pub language: Option<String>,
    pub account_uuid: Option<String>,
    pub organization_id: Option<String>,
    pub terminal_type: Option<String>,
    pub app_version: Option<String>,
    pub resource: Option<String>,
    pub received_at: String,
}

/// Metric entity for internal use
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Metric {
    pub id: String,
    pub session_id: String,
    pub name: String,
    pub timestamp: i64,
    pub value: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metric_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decision: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account_uuid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub organization_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub terminal_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub app_version: Option<String>,
    pub received_at: String,
}

/// New metric for insertion (without received_at)
#[derive(Debug, Clone)]
pub struct NewMetric {
    pub id: String,
    pub session_id: String,
    pub name: String,
    pub timestamp: i64,
    pub value: f64,
    pub metric_type: Option<String>,
    pub model: Option<String>,
    pub tool: Option<String>,
    pub decision: Option<String>,
    pub language: Option<String>,
    pub account_uuid: Option<String>,
    pub organization_id: Option<String>,
    pub terminal_type: Option<String>,
    pub app_version: Option<String>,
    pub resource: Option<String>,
}

impl From<MetricRow> for Metric {
    fn from(row: MetricRow) -> Self {
        Self {
            id: row.id,
            session_id: row.session_id,
            name: row.name,
            timestamp: row.timestamp,
            value: row.value,
            metric_type: row.metric_type,
            model: row.model,
            tool: row.tool,
            decision: row.decision,
            language: row.language,
            account_uuid: row.account_uuid,
            organization_id: row.organization_id,
            terminal_type: row.terminal_type,
            app_version: row.app_version,
            received_at: row.received_at,
        }
    }
}
