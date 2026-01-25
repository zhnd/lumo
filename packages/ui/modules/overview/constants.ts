import type {
  OverviewStats,
  UsageTrendPoint,
  ModelUsage,
  TokenByModel,
  ProductivityMetrics,
} from "./types";

// Mock overview statistics
export const MOCK_STATS: OverviewStats = {
  totalCost: 18.42,
  totalTokens: 378500,
  cacheTokens: 132475,
  cachePercentage: 35,
  activeTimeSeconds: 9300, // 2h 35m
  totalSessions: 12,
  todaySessions: 3,
  costChangePercent: 12,
} as const;

// Mock usage trend data (last 7 days)
export const MOCK_USAGE_TRENDS: UsageTrendPoint[] = [
  { date: "Mon", cost: 2.15, inputTokens: 45000, outputTokens: 12000, cacheReadTokens: 18000 },
  { date: "Tue", cost: 3.42, inputTokens: 52000, outputTokens: 18000, cacheReadTokens: 22000 },
  { date: "Wed", cost: 1.85, inputTokens: 38000, outputTokens: 9000, cacheReadTokens: 15000 },
  { date: "Thu", cost: 4.21, inputTokens: 67000, outputTokens: 22000, cacheReadTokens: 28000 },
  { date: "Fri", cost: 2.56, inputTokens: 48000, outputTokens: 15000, cacheReadTokens: 19000 },
  { date: "Sat", cost: 2.89, inputTokens: 56000, outputTokens: 19000, cacheReadTokens: 21000 },
  { date: "Sun", cost: 1.34, inputTokens: 32000, outputTokens: 8000, cacheReadTokens: 12000 },
] as const;

// Mock model usage data
export const MOCK_MODEL_USAGE: ModelUsage[] = [
  {
    model: "claude-sonnet-4-20250514",
    displayName: "Sonnet 4",
    cost: 12.45,
    requests: 89,
    tokens: 260000,
  },
  {
    model: "claude-opus-4-20250514",
    displayName: "Opus 4",
    cost: 5.60,
    requests: 15,
    tokens: 50000,
  },
  {
    model: "claude-haiku-3-5-20250929",
    displayName: "Haiku 3.5",
    cost: 0.37,
    requests: 52,
    tokens: 91500,
  },
  {
    model: "claude-sonnet-4-5-20250929",
    displayName: "Sonnet 4.5",
    cost: 2.85,
    requests: 24,
    tokens: 43700,
  },
] as const;

// Mock token breakdown by model
export const MOCK_TOKENS_BY_MODEL: TokenByModel[] = [
  {
    model: "claude-sonnet-4-20250514",
    displayName: "Sonnet 4",
    input: 120000,
    output: 45000,
    cacheRead: 80000,
    cacheCreation: 15000,
  },
  {
    model: "claude-opus-4-20250514",
    displayName: "Opus 4",
    input: 30000,
    output: 12000,
    cacheRead: 0,
    cacheCreation: 8000,
  },
  {
    model: "claude-haiku-3-5-20250929",
    displayName: "Haiku 3.5",
    input: 35200,
    output: 21300,
    cacheRead: 35000,
    cacheCreation: 0,
  },
  {
    model: "claude-sonnet-4-5-20250929",
    displayName: "Sonnet 4.5",
    input: 18500,
    output: 8200,
    cacheRead: 12000,
    cacheCreation: 5000,
  },
] as const;

// Mock productivity metrics
export const MOCK_PRODUCTIVITY: ProductivityMetrics = {
  linesAdded: 1247,
  linesRemoved: 389,
  pullRequests: 3,
  commits: 12,
  codeEditsAccepted: 89,
  codeEditsRejected: 7,
} as const;
