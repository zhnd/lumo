import { invoke } from "@tauri-apps/api/core";
import type {
  UsageTrend,
  CostByModelTrend,
  CostEfficiencyTrend,
  TimeRange,
} from "../generated/typeshare-types";

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

  static async getCostByModelTrends(timeRange: TimeRange): Promise<CostByModelTrend[]> {
    return invoke<CostByModelTrend[]>("get_cost_by_model_trends", { timeRange });
  }

  static async getCostEfficiencyTrend(timeRange: TimeRange): Promise<CostEfficiencyTrend[]> {
    return invoke<CostEfficiencyTrend[]>("get_cost_efficiency_trend", { timeRange });
  }
}
