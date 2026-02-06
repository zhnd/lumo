"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendsBridge } from "@/src/bridges/trends-bridge";
import type { TimeRange } from "@/src/generated/typeshare-types";

export function useService(timeRange: TimeRange) {
  const { data, isLoading, error, refetch } = useQuery({
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
