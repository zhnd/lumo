//! Time range utilities
//!
//! Shared helpers for time range bounds and date label generation.

use chrono::{Datelike, Duration, Local, NaiveDate, TimeZone, Timelike};

use crate::types::TimeRange;

/// Get time range start and end timestamps (in milliseconds)
pub fn get_time_range_bounds(time_range: TimeRange) -> (i64, i64) {
    let now = Local::now();
    let end_time = now.timestamp_millis();

    let start = match time_range {
        TimeRange::Today => now.date_naive().and_hms_opt(0, 0, 0).unwrap(),
        TimeRange::Week => {
            let days_since_monday = now.weekday().num_days_from_monday() as i64;
            (now - Duration::days(days_since_monday))
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

    let start_time = Local
        .from_local_datetime(&start)
        .unwrap()
        .timestamp_millis();
    (start_time, end_time)
}

/// Generate all date/hour labels for the given time range.
///
/// - `Today`: hourly labels from "00:00" to current hour
/// - `Week`: daily labels from Monday to today
/// - `Month`: daily labels from 1st to today
pub fn generate_date_labels(time_range: TimeRange) -> Vec<String> {
    let now = Local::now();

    match time_range {
        TimeRange::Today => {
            let current_hour = now.hour();
            (0..=current_hour)
                .map(|h| format!("{:02}:00", h))
                .collect()
        }
        TimeRange::Week => {
            let days_since_monday = now.weekday().num_days_from_monday() as i64;
            let monday = now.date_naive() - Duration::days(days_since_monday);
            generate_daily_labels(monday, now.date_naive())
        }
        TimeRange::Month => {
            let first = now.date_naive().with_day(1).unwrap();
            generate_daily_labels(first, now.date_naive())
        }
    }
}

fn generate_daily_labels(start: NaiveDate, end: NaiveDate) -> Vec<String> {
    let mut dates = Vec::new();
    let mut current = start;
    while current <= end {
        dates.push(current.format("%Y-%m-%d").to_string());
        current += Duration::days(1);
    }
    dates
}
