"use client";

import { useRef, useEffect } from "react";
import * as echarts from "echarts/core";
import {
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  TreemapChart,
  GaugeChart,
  HeatmapChart,
} from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CalendarComponent,
  VisualMapComponent,
  RadarComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  TreemapChart,
  GaugeChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CalendarComponent,
  VisualMapComponent,
  RadarComponent,
  CanvasRenderer,
]);

/**
 * Resolve a CSS variable (e.g. "--chart-1") to a canvas-safe rgb() string.
 */
export function resolveChartColor(cssVar: string): string {
  if (typeof document === "undefined") return "#888";
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
  if (!raw) return "#888";
  const el = document.createElement("div");
  el.style.color = `hsl(${raw})`;
  document.body.appendChild(el);
  const resolved = getComputedStyle(el).color;
  document.body.removeChild(el);
  return resolved;
}

/**
 * Like resolveChartColor but with alpha. Returns "rgba(r, g, b, a)".
 */
export function resolveChartColorAlpha(cssVar: string, alpha: number): string {
  const rgb = resolveChartColor(cssVar);
  return rgb.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
}

interface EChartsProps {
  option: EChartsOption;
  className?: string;
  style?: React.CSSProperties;
}

export function EChart({ option, className, style }: EChartsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  // Single effect: init chart if needed, then setOption
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Init if not yet created or disposed
    if (!chartRef.current || chartRef.current.isDisposed()) {
      chartRef.current = echarts.init(el);

      observerRef.current?.disconnect();
      const chart = chartRef.current;
      const observer = new ResizeObserver(() => chart.resize());
      observer.observe(el);
      observerRef.current = observer;
    }

    const textColor = resolveChartColor("--muted-foreground");
    chartRef.current.setOption(
      {
        textStyle: { color: textColor, fontSize: 12 },
        ...option,
      },
      true,
    );
  }, [option]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", ...style }}
    />
  );
}

export type { EChartsOption };
