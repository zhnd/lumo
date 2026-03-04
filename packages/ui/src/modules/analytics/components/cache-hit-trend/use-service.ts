"use client";

import { useQuery } from "@tanstack/react-query";
import { AnalyticsBridge } from "@/bridges/analytics-bridge";
import type { TimeRange } from "@/generated/typeshare-types";
import { foregroundRefreshQueryOptions } from "@/lib/query-options";

export function useService(timeRange: TimeRange) {
  const { data, isLoading, error, refetch } = useQuery({
    ...foregroundRefreshQueryOptions,
    queryKey: ["cache-hit-trend", timeRange],
    queryFn: () => AnalyticsBridge.getCacheHitTrend(timeRange),
  });

  return {
    data: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
