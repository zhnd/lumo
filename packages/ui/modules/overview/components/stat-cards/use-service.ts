"use client";

import { useQuery } from "@tanstack/react-query";
import { StatsBridge } from "@/src/bridges/stats-bridge";
import type { SummaryStats, TimeRange } from "@/src/generated/typeshare-types";

const DEFAULT_STATS: SummaryStats = {
  totalCost: 0,
  totalTokens: 0,
  cacheTokens: 0,
  cachePercentage: 0,
  activeTimeSeconds: 0,
  totalSessions: 0,
  todaySessions: 0,
  costChangePercent: 0,
  linesOfCodeAdded: 0,
  linesOfCodeRemoved: 0,
  pullRequests: 0,
  commits: 0,
  codeEditAccepts: 0,
  codeEditRejects: 0,
};

export function useService(timeRange: TimeRange) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["summary-stats", timeRange],
    queryFn: () => StatsBridge.getSummaryStats(timeRange),
  });

  return {
    stats: data ?? DEFAULT_STATS,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
