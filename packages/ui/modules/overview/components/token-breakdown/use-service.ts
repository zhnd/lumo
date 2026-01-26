"use client";

import { useQuery } from "@tanstack/react-query";
import { StatsBridge } from "@/src/bridges/stats-bridge";
import type { TimeRange } from "@/src/generated/typeshare-types";

export function useService(timeRange: TimeRange) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["token-stats", timeRange],
    queryFn: () => StatsBridge.getTokenStats(timeRange),
  });

  // Calculate totals
  const totals =
    data?.reduce(
      (acc, model) => ({
        input: acc.input + model.input,
        output: acc.output + model.output,
        cacheRead: acc.cacheRead + model.cacheRead,
        cacheCreation: acc.cacheCreation + model.cacheCreation,
      }),
      { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }
    ) ?? { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };

  const grandTotal =
    totals.input + totals.output + totals.cacheRead + totals.cacheCreation;

  const cachePercentage =
    grandTotal > 0 ? (totals.cacheRead / grandTotal) * 100 : 0;

  return {
    data: data ?? [],
    totals,
    grandTotal,
    cachePercentage,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
