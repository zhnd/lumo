"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendsBridge } from "@/bridges/trends-bridge";
import type { TimeRange } from "@/generated/typeshare-types";
import { foregroundRefreshQueryOptions } from "@/lib/query-options";

export function useService(timeRange: TimeRange) {
  const { data, isLoading, error, refetch } = useQuery({
    ...foregroundRefreshQueryOptions,
    queryKey: ["cost-efficiency-trend", timeRange],
    queryFn: () => TrendsBridge.getCostEfficiencyTrend(timeRange),
  });

  return {
    data: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
