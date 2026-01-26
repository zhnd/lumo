"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendsBridge } from "@/src/bridges/trends-bridge";
import type { TimeRange } from "@/src/generated/typeshare-types";

export function useService(timeRange: TimeRange) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["usage-trends", timeRange],
    queryFn: () => TrendsBridge.getUsageTrends(timeRange),
  });

  const totalTokens =
    data?.reduce(
      (sum, d) => sum + d.inputTokens + d.outputTokens + d.cacheReadTokens,
      0
    ) ?? 0;

  return {
    data: data ?? [],
    totalTokens,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
