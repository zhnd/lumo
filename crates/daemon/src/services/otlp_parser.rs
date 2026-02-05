//! OTLP data parser
//!
//! Converts OTLP metrics and logs into our database entities.

use opentelemetry_proto::tonic::collector::logs::v1::ExportLogsServiceRequest;
use opentelemetry_proto::tonic::collector::metrics::v1::ExportMetricsServiceRequest;
use opentelemetry_proto::tonic::common::v1::{any_value, AnyValue, KeyValue};
use shared::{NewEvent, NewMetric};
use uuid::Uuid;

/// Parse OTLP metrics request into NewMetric entities
pub fn parse_metrics(request: &ExportMetricsServiceRequest) -> Vec<NewMetric> {
    let mut metrics = Vec::new();

    for resource_metrics in &request.resource_metrics {
        // Extract resource attributes
        let resource_attrs = resource_metrics
            .resource
            .as_ref()
            .map(|r| extract_attributes(&r.attributes));

        let resource_json = resource_attrs
            .as_ref()
            .and_then(|attrs| serde_json::to_string(attrs).ok());

        for scope_metrics in &resource_metrics.scope_metrics {
            for metric in &scope_metrics.metrics {
                let metric_name = &metric.name;
                let metric_unit = if metric.unit.is_empty() {
                    None
                } else {
                    Some(metric.unit.clone())
                };
                let metric_description = if metric.description.is_empty() {
                    None
                } else {
                    Some(metric.description.clone())
                };

                // Handle different metric data types
                if let Some(data) = &metric.data {
                    match data {
                        opentelemetry_proto::tonic::metrics::v1::metric::Data::Sum(sum) => {
                            for data_point in &sum.data_points {
                                let attrs = extract_attributes(&data_point.attributes);
                                let value = extract_number_value(data_point);
                                let timestamp = data_point.time_unix_nano as i64 / 1_000_000; // ns to ms

                                metrics.push(create_metric(
                                    metric_name,
                                    timestamp,
                                    value,
                                    &attrs,
                                    resource_json.as_deref(),
                                    metric_unit.as_deref(),
                                    metric_description.as_deref(),
                                ));
                            }
                        }
                        opentelemetry_proto::tonic::metrics::v1::metric::Data::Gauge(gauge) => {
                            for data_point in &gauge.data_points {
                                let attrs = extract_attributes(&data_point.attributes);
                                let value = extract_number_value(data_point);
                                let timestamp = data_point.time_unix_nano as i64 / 1_000_000;

                                metrics.push(create_metric(
                                    metric_name,
                                    timestamp,
                                    value,
                                    &attrs,
                                    resource_json.as_deref(),
                                    metric_unit.as_deref(),
                                    metric_description.as_deref(),
                                ));
                            }
                        }
                        opentelemetry_proto::tonic::metrics::v1::metric::Data::Histogram(hist) => {
                            for data_point in &hist.data_points {
                                let attrs = extract_attributes(&data_point.attributes);
                                let value = data_point.sum.unwrap_or(0.0);
                                let timestamp = data_point.time_unix_nano as i64 / 1_000_000;

                                metrics.push(create_metric(
                                    metric_name,
                                    timestamp,
                                    value,
                                    &attrs,
                                    resource_json.as_deref(),
                                    metric_unit.as_deref(),
                                    metric_description.as_deref(),
                                ));
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    metrics
}

/// Parse OTLP logs request into NewEvent entities
pub fn parse_logs_to_events(request: &ExportLogsServiceRequest) -> Vec<NewEvent> {
    let mut events = Vec::new();

    for resource_logs in &request.resource_logs {
        let resource_attrs = resource_logs
            .resource
            .as_ref()
            .map(|r| extract_attributes(&r.attributes));

        let resource_json = resource_attrs
            .as_ref()
            .and_then(|attrs| serde_json::to_string(attrs).ok());

        for scope_logs in &resource_logs.scope_logs {
            for log_record in &scope_logs.log_records {
                let attrs = extract_attributes(&log_record.attributes);
                let timestamp = log_record.time_unix_nano as i64 / 1_000_000; // ns to ms

                // Extract event name from attributes or body
                let event_name = attrs
                    .get("event.name")
                    .cloned()
                    .or_else(|| extract_body_string(&log_record.body))
                    .unwrap_or_else(|| "unknown".to_string());

                // Prefix with claude_code if not already
                let event_name = if event_name.starts_with("claude_code.") {
                    event_name
                } else {
                    format!("claude_code.{}", event_name)
                };

                events.push(create_event(&event_name, timestamp, &attrs, resource_json.as_deref()));
            }
        }
    }

    events
}

/// Extract attributes from KeyValue list into a HashMap
fn extract_attributes(attrs: &[KeyValue]) -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::new();
    for kv in attrs {
        if let Some(value) = &kv.value {
            if let Some(s) = extract_any_value_string(value) {
                map.insert(kv.key.clone(), s);
            }
        }
    }
    map
}

/// Extract string value from AnyValue
fn extract_any_value_string(value: &AnyValue) -> Option<String> {
    value.value.as_ref().and_then(|v| match v {
        any_value::Value::StringValue(s) => Some(s.clone()),
        any_value::Value::IntValue(i) => Some(i.to_string()),
        any_value::Value::DoubleValue(d) => Some(d.to_string()),
        any_value::Value::BoolValue(b) => Some(b.to_string()),
        _ => None,
    })
}

/// Extract string from log body
fn extract_body_string(body: &Option<AnyValue>) -> Option<String> {
    body.as_ref().and_then(extract_any_value_string)
}

/// Extract number value from a data point
fn extract_number_value(
    data_point: &opentelemetry_proto::tonic::metrics::v1::NumberDataPoint,
) -> f64 {
    match &data_point.value {
        Some(opentelemetry_proto::tonic::metrics::v1::number_data_point::Value::AsDouble(d)) => *d,
        Some(opentelemetry_proto::tonic::metrics::v1::number_data_point::Value::AsInt(i)) => {
            *i as f64
        }
        None => 0.0,
    }
}

/// Create a NewMetric from parsed data
fn create_metric(
    name: &str,
    timestamp: i64,
    value: f64,
    attrs: &std::collections::HashMap<String, String>,
    resource: Option<&str>,
    unit: Option<&str>,
    description: Option<&str>,
) -> NewMetric {
    NewMetric {
        id: Uuid::new_v4().to_string(),
        session_id: attrs
            .get("session.id")
            .cloned()
            .unwrap_or_else(|| "unknown".to_string()),
        name: name.to_string(),
        timestamp,
        value,
        metric_type: attrs.get("type").cloned(),
        model: attrs.get("model").cloned(),
        tool: attrs.get("tool").cloned(),
        decision: attrs.get("decision").cloned(),
        language: attrs.get("language").cloned(),
        account_uuid: attrs.get("user.account_uuid").cloned(),
        organization_id: attrs.get("organization.id").cloned(),
        terminal_type: attrs.get("terminal.type").cloned(),
        app_version: attrs.get("app.version").cloned(),
        resource: resource.map(String::from),
        user_id: attrs.get("user.id").cloned(),
        user_email: attrs.get("user.email").cloned(),
        unit: unit.map(String::from),
        description: description.map(String::from),
    }
}

/// Create a NewEvent from parsed data
fn create_event(
    name: &str,
    timestamp: i64,
    attrs: &std::collections::HashMap<String, String>,
    resource: Option<&str>,
) -> NewEvent {
    NewEvent {
        id: Uuid::new_v4().to_string(),
        session_id: attrs
            .get("session.id")
            .cloned()
            .unwrap_or_else(|| "unknown".to_string()),
        name: name.to_string(),
        timestamp,
        duration_ms: attrs.get("duration_ms").and_then(|s| s.parse().ok()),
        success: attrs.get("success").map(|s| s == "true"),
        error: attrs.get("error").cloned(),
        model: attrs.get("model").cloned(),
        cost_usd: attrs.get("cost_usd").and_then(|s| s.parse().ok()),
        input_tokens: attrs.get("input_tokens").and_then(|s| s.parse().ok()),
        output_tokens: attrs.get("output_tokens").and_then(|s| s.parse().ok()),
        cache_read_tokens: attrs.get("cache_read_tokens").and_then(|s| s.parse().ok()),
        cache_creation_tokens: attrs.get("cache_creation_tokens").and_then(|s| s.parse().ok()),
        status_code: attrs.get("status_code").and_then(|s| s.parse().ok()),
        attempt: attrs.get("attempt").and_then(|s| s.parse().ok()),
        tool_name: attrs.get("tool_name").cloned(),
        tool_decision: attrs.get("decision").cloned(),
        decision_source: attrs.get("source").cloned(),
        tool_parameters: attrs.get("tool_parameters").cloned(),
        prompt_length: attrs.get("prompt_length").and_then(|s| s.parse().ok()),
        prompt: attrs.get("prompt").cloned(),
        account_uuid: attrs.get("user.account_uuid").cloned(),
        organization_id: attrs.get("organization.id").cloned(),
        terminal_type: attrs.get("terminal.type").cloned(),
        app_version: attrs.get("app.version").cloned(),
        resource: resource.map(String::from),
        user_id: attrs.get("user.id").cloned(),
        user_email: attrs.get("user.email").cloned(),
        event_sequence: attrs.get("event.sequence").and_then(|s| s.parse().ok()),
        tool_result_size_bytes: attrs.get("tool_result_size_bytes").and_then(|s| s.parse().ok()),
    }
}
