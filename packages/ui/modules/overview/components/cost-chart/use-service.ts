"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendsBridge } from "@/src/bridges/trends-bridge";
import type { TimeRange } from "@/src/generated/typeshare-types";

export function useService(timeRange: TimeRange) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["usage-trends", timeRange],
    queryFn: () => TrendsBridge.getUsageTrends(timeRange),
  });

  const totalCost = data?.reduce((sum, d) => sum + d.cost, 0) ?? 0;

  return {
    data: data ?? [],
    totalCost,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
