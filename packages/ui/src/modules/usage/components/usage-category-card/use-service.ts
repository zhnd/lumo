"use client";

import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import {
  resolveChartColor,
  resolveChartColorAlpha,
} from "@/components/echarts";
import type { UsageBucket } from "@/generated/typeshare-types";
import {
  buildUsageStatusTheme,
  getUsageStatus,
  prefersReducedMotion,
} from "./libs";
import type { UseUsageBucketCardResult } from "./types";

export function useUsageBucketCard(
  bucket: UsageBucket,
): UseUsageBucketCardResult {
  return useMemo(() => {
    // `utilization: null` from the backend means "section is present but
    // has no usage yet" — we still render the gauge (full ring at 100%
    // remaining) so the card matches the other buckets visually.
    const isUntouched = bucket.utilization == null;
    const utilization = bucket.utilization ?? 0;
    const percentRemaining = Math.round(
      Math.max(0, Math.min(100, 100 - utilization)),
    );
    const status = getUsageStatus(percentRemaining);
    const theme = buildUsageStatusTheme(status);
    const mutedColor = resolveChartColor("--muted-foreground");
    const reducedMotion = prefersReducedMotion();

    // Background color bands — inverted semantics because we display
    // REMAINING: the "safe" zone is where a full ring points (high
    // remaining values). Bands widths add up to 1.
    const bands: [number, string][] = [
      [0.2, resolveChartColorAlpha("--destructive", 0.28)],
      [0.5, resolveChartColorAlpha("--chart-4", 0.28)],
      [1.0, resolveChartColorAlpha("--chart-3", 0.28)],
    ];

    const option: EChartsOption = {
      animation: !reducedMotion,
      series: [
        {
          type: "gauge",
          startAngle: 90,
          endAngle: -270,
          radius: "92%",
          min: 0,
          max: 100,
          progress: {
            show: true,
            width: 14,
            roundCap: true,
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 1,
                y2: 1,
                colorStops: [
                  { offset: 0, color: theme.gradientStart },
                  { offset: 1, color: theme.gradientEnd },
                ],
              },
            },
          },
          axisLine: {
            lineStyle: {
              width: 14,
              color: bands,
            },
          },
          pointer: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          anchor: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: !reducedMotion,
            offsetCenter: [0, "-8%"],
            fontSize: 32,
            fontWeight: 700,
            color: theme.primary,
            formatter: "{value}%",
          },
          data: [{ value: percentRemaining }],
        },
        // Second invisible gauge that only contributes a "REMAINING" sublabel
        // beneath the big number. Cheaper than adding a `graphic` layer.
        {
          type: "gauge",
          radius: "92%",
          startAngle: 90,
          endAngle: -270,
          axisLine: { show: false },
          pointer: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          title: { show: false },
          detail: {
            offsetCenter: [0, "28%"],
            fontSize: 10,
            fontWeight: 600,
            color: mutedColor,
            formatter: "REMAINING",
          },
          data: [{ value: 0 }],
        },
      ],
    };

    return {
      isUntouched,
      percentRemaining,
      status,
      option,
      resetText: bucket.resetsAt ?? null,
    };
  }, [bucket]);
}
