"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { WrappedBridge } from "@/bridges/wrapped-bridge";
import { WrappedPeriod } from "@/generated/typeshare-types";
import { foregroundRefreshQueryOptions } from "@/lib/query-options";
import type { UseServiceReturn } from "./types";

export function useService(): UseServiceReturn {
  const [period, setPeriod] = useState<WrappedPeriod>(WrappedPeriod.Today);

  const { data, isLoading, error, refetch } = useQuery({
    ...foregroundRefreshQueryOptions,
    queryKey: ["wrapped-data", period],
    queryFn: () => WrappedBridge.getWrappedData(period),
  });

  const hasMeaningfulData = useMemo(() => {
    if (!data) return false;
    return (
      data.totalSessions > 0 ||
      data.totalCost > 0 ||
      data.topToolCount > 0 ||
      data.costSparkline.some((v) => v > 0)
    );
  }, [data]);

  return {
    period,
    setPeriod,
    data,
    hasMeaningfulData,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
