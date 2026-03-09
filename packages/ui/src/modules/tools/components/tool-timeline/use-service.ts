"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ToolsBridge } from "@/bridges/tools-bridge";
import type { TimeRange } from "@/generated/typeshare-types";
import { foregroundRefreshQueryOptions } from "@/lib/query-options";

export function useService(timeRange: TimeRange) {
  const { data, isLoading, error, refetch } = useQuery({
    ...foregroundRefreshQueryOptions,
    queryKey: ["tool-trends", timeRange],
    queryFn: () => ToolsBridge.getToolTrends(timeRange),
  });

  const { dates, toolNames, series } = useMemo(() => {
    const items = data ?? [];
    const dateSet = new Set<string>();
    const toolSet = new Set<string>();
    for (const item of items) {
      dateSet.add(item.date);
      toolSet.add(item.toolName);
    }
    const dates = [...dateSet].sort();
    const toolNames = [...toolSet];

    const series = toolNames.map((name) => {
      const counts = dates.map((date) => {
        const match = items.find((i) => i.toolName === name && i.date === date);
        return match?.count ?? 0;
      });
      return { name, data: counts };
    });

    return { dates, toolNames, series };
  }, [data]);

  return {
    dates,
    toolNames,
    series,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
