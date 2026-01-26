// Re-export generated types for convenience
export {
  TimeRange,
  type SummaryStats,
  type UsageTrend,
  type ModelStats,
  type TokenStats,
  type Session,
} from "@/src/generated/typeshare-types";

// Frontend-only types (not generated from backend)

/** Aggregated token totals by type */
export interface TokenTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}
