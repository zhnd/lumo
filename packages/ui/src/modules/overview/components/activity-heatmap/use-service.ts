"use client";

import { useQuery } from "@tanstack/react-query";
import { AnalyticsBridge } from "@/bridges/analytics-bridge";
import { foregroundRefreshQueryOptions } from "@/lib/query-options";

export function useService() {
  const { data, isLoading, error, refetch } = useQuery({
    ...foregroundRefreshQueryOptions,
    queryKey: ["activity-heatmap"],
    queryFn: () => AnalyticsBridge.getActivityHeatmap(),
  });

  return {
    data: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
