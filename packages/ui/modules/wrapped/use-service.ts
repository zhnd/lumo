"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WrappedBridge } from "@/src/bridges/wrapped-bridge";
import { WrappedPeriod } from "@/src/generated/typeshare-types";
import type { UseServiceReturn } from "./types";

export function useService(): UseServiceReturn {
  const [period, setPeriod] = useState<WrappedPeriod>(WrappedPeriod.Today);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wrapped-data", period],
    queryFn: () => WrappedBridge.getWrappedData(period),
  });

  const hasMeaningfulData = useMemo(() => {
    if (!data) return false;
    return (
      data.totalSessions > 0 ||
      data.totalTokens > 0 ||
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
