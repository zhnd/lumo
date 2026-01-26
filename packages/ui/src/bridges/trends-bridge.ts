import { invoke } from "@tauri-apps/api/core";
import type { UsageTrend, TimeRange } from "../generated/typeshare-types";

/**
 * Trends Bridge - Frontend interface for trends operations
 */
export class TrendsBridge {
  /**
   * Get usage trends for a time range
   */
  static async getUsageTrends(timeRange: TimeRange): Promise<UsageTrend[]> {
    return invoke<UsageTrend[]>("get_usage_trends", { timeRange });
  }
}
