import { invoke } from "@tauri-apps/api/core";
import type {
  HourlyActivity,
  SessionBucket,
  ErrorRateStats,
  ActivityDay,
  CacheHitTrend,
  TimeRange,
} from "../generated/typeshare-types";

/**
 * Analytics Bridge - Frontend interface for analytics operations
 */
export class AnalyticsBridge {
  static async getHourlyActivity(
    timeRange: TimeRange,
  ): Promise<HourlyActivity[]> {
    return invoke<HourlyActivity[]>("get_hourly_activity", { timeRange });
  }

  static async getSessionLengthDistribution(
    timeRange: TimeRange,
  ): Promise<SessionBucket[]> {
    return invoke<SessionBucket[]>("get_session_length_distribution", {
      timeRange,
    });
  }

  static async getErrorRate(timeRange: TimeRange): Promise<ErrorRateStats> {
    return invoke<ErrorRateStats>("get_error_rate", { timeRange });
  }

  static async getCacheHitTrend(
    timeRange: TimeRange,
  ): Promise<CacheHitTrend[]> {
    return invoke<CacheHitTrend[]>("get_cache_hit_trend", { timeRange });
  }

  static async getActivityHeatmap(): Promise<ActivityDay[]> {
    return invoke<ActivityDay[]>("get_activity_heatmap");
  }
}
