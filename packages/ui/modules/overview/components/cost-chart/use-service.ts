"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendsBridge } from "@/src/bridges/trends-bridge";
import type { TimeRange } from "@/src/generated/typeshare-types";

export function useService(timeRange: TimeRange) {
  const { data: raw, isLoading, error, refetch } = useQuery({
    queryKey: ["cost-by-model-trends", timeRange],
    queryFn: () => TrendsBridge.getCostByModelTrends(timeRange),
  });

  const { dates, models, seriesMap, totalCost } = useMemo(() => {
    const items = raw ?? [];
    const dateSet = new Set<string>();
    const modelSet = new Set<string>();
    let total = 0;

    for (const item of items) {
      dateSet.add(item.date);
      modelSet.add(item.model);
      total += item.cost;
    }

    const dates = Array.from(dateSet);
    const models = Array.from(modelSet);

    // Build a map: model -> { date -> cost }
    const seriesMap = new Map<string, Map<string, number>>();
    for (const m of models) {
      seriesMap.set(m, new Map());
    }
    for (const item of items) {
      seriesMap.get(item.model)!.set(item.date, item.cost);
    }

    return { dates, models, seriesMap, totalCost: total };
  }, [raw]);

  return {
    dates,
    models,
    seriesMap,
    totalCost,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
