import { invoke } from "@tauri-apps/api/core";
import type {
  CodeEditLanguageStats,
  TimeRange,
  ToolTrend,
  ToolUsageStats,
} from "../generated/typeshare-types";

/**
 * Tools Bridge - Frontend interface for tool analysis operations
 */
export class ToolsBridge {
  static async getToolUsageStats(
    timeRange: TimeRange,
  ): Promise<ToolUsageStats[]> {
    return invoke<ToolUsageStats[]>("get_tool_usage_stats", { timeRange });
  }

  static async getCodeEditByLanguage(
    timeRange: TimeRange,
  ): Promise<CodeEditLanguageStats[]> {
    return invoke<CodeEditLanguageStats[]>("get_code_edit_by_language", {
      timeRange,
    });
  }

  static async getToolTrends(timeRange: TimeRange): Promise<ToolTrend[]> {
    return invoke<ToolTrend[]>("get_tool_trends", { timeRange });
  }
}
