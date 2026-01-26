"use client";

import { useQuery } from "@tanstack/react-query";
import { StatsBridge } from "@/src/bridges/stats-bridge";
import type { TimeRange } from "@/src/generated/typeshare-types";
import type { ProductivityMetricsData } from "./types";

const DEFAULT_DATA: ProductivityMetricsData = {
  linesAdded: 0,
  linesRemoved: 0,
  pullRequests: 0,
  commits: 0,
  codeEditsAccepted: 0,
  codeEditsRejected: 0,
};

export function useService(timeRange: TimeRange) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["summary-stats", timeRange],
    queryFn: () => StatsBridge.getSummaryStats(timeRange),
  });

  const productivityData: ProductivityMetricsData = data
    ? {
        linesAdded: data.linesOfCodeAdded,
        linesRemoved: data.linesOfCodeRemoved,
        pullRequests: data.pullRequests,
        commits: data.commits,
        codeEditsAccepted: data.codeEditAccepts,
        codeEditsRejected: data.codeEditRejects,
      }
    : DEFAULT_DATA;

  return {
    data: productivityData,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
