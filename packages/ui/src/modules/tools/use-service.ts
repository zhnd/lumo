"use client";

import { useState } from "react";
import { TimeRange } from "@/generated/typeshare-types";

export function useService() {
  const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.Today);

  return {
    timeRange,
    setTimeRange,
  };
}
