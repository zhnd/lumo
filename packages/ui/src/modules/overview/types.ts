// Re-export generated types for convenience
export {
  type ModelStats,
  type Session,
  type SummaryStats,
  TimeRange,
  type TokenStats,
  type UsageTrend,
} from "@/generated/typeshare-types";

// Frontend-only types (not generated from backend)

/** Aggregated token totals by type */
export interface TokenTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}
