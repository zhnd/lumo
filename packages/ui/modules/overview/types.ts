export type TimeRange = "today" | "week" | "month";

// Overview statistics
export interface OverviewStats {
  totalCost: number;
  totalTokens: number;
  cacheTokens: number;
  cachePercentage: number;
  activeTimeSeconds: number;
  totalSessions: number;
  todaySessions: number;
  costChangePercent?: number;
}

// Usage trend data point (for charts)
export interface UsageTrendPoint {
  date: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

// Model usage breakdown
export interface ModelUsage {
  model: string;
  displayName: string;
  cost: number;
  requests: number;
  tokens: number;
}

// Token breakdown by model and type
export interface TokenByModel {
  model: string;
  displayName: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

// Aggregated token totals by type
export interface TokenTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

// Productivity metrics
export interface ProductivityMetrics {
  linesAdded: number;
  linesRemoved: number;
  pullRequests: number;
  commits: number;
  codeEditsAccepted: number;
  codeEditsRejected: number;
}

// Session entity (matches backend Session)
export interface Session {
  id: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  eventCount: number;
  apiRequestCount: number;
  errorCount: number;
  toolUseCount: number;
  promptCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCostUsd: number;
  terminalType?: string;
  appVersion?: string;
}

// Service return type
export interface OverviewServiceReturn {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  stats: OverviewStats;
  usageTrends: UsageTrendPoint[];
  modelUsage: ModelUsage[];
  tokensByModel: TokenByModel[];
  productivity: ProductivityMetrics;
}
