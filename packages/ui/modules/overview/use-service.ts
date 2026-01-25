"use client";

import { useState } from "react";
import type { TimeRange, OverviewServiceReturn } from "./types";
import {
  MOCK_STATS,
  MOCK_USAGE_TRENDS,
  MOCK_MODEL_USAGE,
  MOCK_TOKENS_BY_MODEL,
  MOCK_PRODUCTIVITY,
} from "./constants";

export function useService(): OverviewServiceReturn {
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  return {
    timeRange,
    setTimeRange,
    stats: MOCK_STATS,
    usageTrends: [...MOCK_USAGE_TRENDS],
    modelUsage: [...MOCK_MODEL_USAGE],
    tokensByModel: [...MOCK_TOKENS_BY_MODEL],
    productivity: { ...MOCK_PRODUCTIVITY },
  };
}
