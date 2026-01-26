import { invoke } from "@tauri-apps/api/core";
import type {
  SummaryStats,
  ModelStats,
  TokenStats,
  TimeRange,
} from "../generated/typeshare-types";

/**
 * Stats Bridge - Frontend interface for statistics operations
 */
export class StatsBridge {
  /**
   * Get summary statistics for a time range
   */
  static async getSummaryStats(timeRange: TimeRange): Promise<SummaryStats> {
    return invoke<SummaryStats>("get_summary_stats", { timeRange });
  }

  /**
   * Get model usage statistics for a time range
   */
  static async getModelStats(timeRange: TimeRange): Promise<ModelStats[]> {
    return invoke<ModelStats[]>("get_model_stats", { timeRange });
  }

  /**
   * Get token statistics by model for a time range
   */
  static async getTokenStats(timeRange: TimeRange): Promise<TokenStats[]> {
    return invoke<TokenStats[]>("get_token_stats", { timeRange });
  }
}
