"use client";

import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import {
  resolveChartColor,
  resolveChartColorAlpha,
} from "@/components/echarts";
import type { ExtraUsage } from "@/generated/typeshare-types";
import { getUsageStatus } from "../usage-category-card/libs";
import type { UsageStatus } from "../usage-category-card/types";

function buildTheme(status: UsageStatus) {
  switch (status) {
    case "healthy":
      return {
        primary: resolveChartColor("--chart-3"),
        gradientStart: resolveChartColor("--chart-3"),
        gradientEnd: resolveChartColor("--chart-1"),
      };
    case "warning":
      return {
        primary: resolveChartColor("--chart-4"),
        gradientStart: resolveChartColor("--chart-4"),
        gradientEnd: resolveChartColor("--chart-5"),
      };
    case "critical":
      return {
        primary: resolveChartColor("--destructive"),
        gradientStart: resolveChartColor("--destructive"),
        gradientEnd: resolveChartColor("--chart-5"),
      };
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export interface UseExtraUsageCardResult {
  percentRemaining: number;
  status: UsageStatus;
  option: EChartsOption;
  usedDisplay: string | null;
  limitDisplay: string | null;
  resetText: string | null;
}

/**
 * Extra usage mirrors the bucket card visuals but the center label shows
 * the dollar spent, and the sublabel shows the monthly limit. Status is
 * still computed from percent remaining.
 */
export function useExtraUsageCard(extra: ExtraUsage): UseExtraUsageCardResult {
  return useMemo(() => {
    const utilization = extra.utilization ?? 0;
    const percentRemaining = Math.round(
      Math.max(0, Math.min(100, 100 - utilization)),
    );
    const status = getUsageStatus(percentRemaining);
    const theme = buildTheme(status);
    const mutedColor = resolveChartColor("--muted-foreground");
    const reducedMotion = prefersReducedMotion();

    const usedDisplay =
      extra.usedCredits != null ? formatCents(extra.usedCredits) : null;
    const limitDisplay =
      extra.monthlyLimit != null ? formatCents(extra.monthlyLimit) : null;

    const centerText = usedDisplay ?? `${percentRemaining}%`;
    const sublabelText = limitDisplay ? `of ${limitDisplay}` : "REMAINING";

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
            lineStyle: { width: 14, color: bands },
          },
          pointer: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          anchor: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: false,
            offsetCenter: [0, "-8%"],
            fontSize: 26,
            fontWeight: 700,
            color: theme.primary,
            formatter: () => centerText,
          },
          data: [{ value: percentRemaining }],
        },
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
            formatter: () => sublabelText,
          },
          data: [{ value: 0 }],
        },
      ],
    };

    return {
      percentRemaining,
      status,
      option,
      usedDisplay,
      limitDisplay,
      resetText: extra.resetsAt ?? null,
    };
  }, [extra]);
}
