"use client";

import { useQuery } from "@tanstack/react-query";
import { StatsBridge } from "@/src/bridges/stats-bridge";
import type { TimeRange } from "@/src/generated/typeshare-types";

export function useService(timeRange: TimeRange) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["model-stats", timeRange],
    queryFn: () => StatsBridge.getModelStats(timeRange),
  });

  const totalCost = data?.reduce((sum, m) => sum + m.cost, 0) ?? 0;

  return {
    data: data ?? [],
    totalCost,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
