import { resolveChartColor } from "@/components/echarts";
import type { UsageStatus, UsageStatusTheme } from "./types";

/**
 * Map a "percent remaining" value (0-100) to a simple three-tier status.
 * Matches ClaudeBar's thresholds:
 *   - > 50% remaining → healthy
 *   - 20% < remaining ≤ 50% → warning
 *   - ≤ 20% remaining → critical
 */
export function getUsageStatus(percentRemaining: number): UsageStatus {
  if (percentRemaining <= 20) return "critical";
  if (percentRemaining <= 50) return "warning";
  return "healthy";
}

/**
 * Resolve theme colors for the gauge at render time by looking up the
 * Tailwind/shadcn CSS variables. Returns a bundle of colors keyed by
 * status so callers can interpolate them into an ECharts option.
 */
export function buildUsageStatusTheme(status: UsageStatus): UsageStatusTheme {
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

/**
 * Returns `true` when the user has requested reduced motion at the OS
 * level. Used to suppress ECharts' spring animation on gauges so the
 * usage page respects system accessibility settings.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
