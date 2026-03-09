"use client";

import { useQuery } from "@tanstack/react-query";
import { AnalyticsBridge } from "@/bridges/analytics-bridge";
import type { TimeRange } from "@/generated/typeshare-types";
import { foregroundRefreshQueryOptions } from "@/lib/query-options";

export function useService(timeRange: TimeRange) {
  const { data, isLoading, error, refetch } = useQuery({
    ...foregroundRefreshQueryOptions,
    queryKey: ["hourly-activity", timeRange],
    queryFn: () => AnalyticsBridge.getHourlyActivity(timeRange),
  });

  const peakHour = data?.reduce((max, h) => (h.count > max.count ? h : max), {
    hour: 0,
    count: 0,
  });

  return {
    data: data ?? [],
    peakHour: peakHour?.hour ?? 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
