"use client";

import type { EChartsOption } from "echarts";
import {
  BarChart,
  GaugeChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  TreemapChart,
} from "echarts/charts";
import {
  CalendarComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";

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
  GraphicComponent,
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

/**
 * Returns an ECharts option that renders an empty chart skeleton.
 *
 * - `"axis"` (default): grid with dashed split lines and faint y-axis labels
 * - `"pie"`: a faint gray donut ring
 *
 * Both variants show a centered "No data" label.
 */
export function emptyChartOption(type: "axis" | "pie" = "axis"): EChartsOption {
  const mutedColor = resolveChartColor("--muted-foreground");
  const borderColor = resolveChartColorAlpha("--border", 0.4);

  const noDataGraphic = {
    type: "text" as const,
    left: "center" as const,
    top: "middle" as const,
    style: {
      text: "No data",
      fontSize: 13,
      fill: mutedColor,
      opacity: 0.6,
    },
  };

  if (type === "pie") {
    return {
      graphic: noDataGraphic,
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          data: [{ value: 1, itemStyle: { color: borderColor } }],
          label: { show: false },
          emphasis: { disabled: true },
          silent: true,
        },
      ],
    };
  }

  return {
    graphic: noDataGraphic,
    grid: { top: 10, right: 10, bottom: 20, left: 40 },
    xAxis: {
      type: "value",
      show: false,
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      splitNumber: 4,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: borderColor, type: "dashed" },
      },
      axisLabel: {
        color: mutedColor,
        opacity: 0.4,
      },
    },
    series: [],
  };
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
