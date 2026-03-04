"use client";

import { useQuery } from "@tanstack/react-query";
import { ToolsBridge } from "@/bridges/tools-bridge";
import type { TimeRange } from "@/generated/typeshare-types";
import { foregroundRefreshQueryOptions } from "@/lib/query-options";

export function useService(timeRange: TimeRange) {
  const { data, isLoading, error, refetch } = useQuery({
    ...foregroundRefreshQueryOptions,
    queryKey: ["tool-usage-stats", timeRange],
    queryFn: () => ToolsBridge.getToolUsageStats(timeRange),
  });

  const filtered = (data ?? [])
    .filter((d) => d.avgDurationMs != null && d.avgDurationMs > 0)
    .sort((a, b) => (b.avgDurationMs ?? 0) - (a.avgDurationMs ?? 0))
    .slice(0, 10);

  return {
    data: filtered,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
