"use client";

import { useQuery } from "@tanstack/react-query";
import { StatsBridge } from "@/bridges/stats-bridge";
import type { TimeRange } from "@/generated/typeshare-types";
import { foregroundRefreshQueryOptions } from "@/lib/query-options";

export function useService(timeRange: TimeRange) {
  const { data, isLoading, error, refetch } = useQuery({
    ...foregroundRefreshQueryOptions,
    queryKey: ["token-stats", timeRange],
    queryFn: () => StatsBridge.getTokenStats(timeRange),
  });

  return {
    data: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
