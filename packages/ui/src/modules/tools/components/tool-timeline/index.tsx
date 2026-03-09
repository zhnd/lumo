"use client";

import { CardChartEmpty } from "@/components/card-chart-empty";
import { CardError } from "@/components/card-error";
import { CardLoading } from "@/components/card-loading";
import type { EChartsOption } from "@/components/echarts";
import {
  EChart,
  resolveChartColor,
  resolveChartColorAlpha,
} from "@/components/echarts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeRange } from "@/generated/typeshare-types";
import type { ToolTimelineProps } from "./types";
import { useService } from "./use-service";

export function ToolTimeline({ timeRange }: ToolTimelineProps) {
  const COLORS = [
    resolveChartColor("--chart-1"),
    resolveChartColor("--chart-2"),
    resolveChartColor("--chart-3"),
    resolveChartColor("--chart-4"),
    resolveChartColor("--chart-5"),
  ];
  const { dates, series, isLoading, error, refetch } = useService(timeRange);

  if (isLoading) return <CardLoading showTitle />;
  if (error)
    return (
      <CardError
        title="Tool Timeline"
        message="Failed to load data"
        onRetry={() => refetch()}
      />
    );
  if (series.length === 0) {
    return <CardChartEmpty title="Tool Timeline (Top 5)" height={250} />;
  }

  const option: EChartsOption = {
    tooltip: { trigger: "axis", borderColor: "transparent" },
    legend: {
      data: series.map((s) => s.name),
      bottom: 0,
      textStyle: { color: resolveChartColor("--muted-foreground") },
    },
    grid: { top: 10, right: 10, bottom: 30, left: 0, outerBoundsMode: "same" },
    xAxis: {
      type: "category",
      data: dates.map((d) => (timeRange === TimeRange.Today ? d : d.slice(5))), // HH:00 or MM-DD
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: resolveChartColorAlpha("--border", 0.5) },
      },
    },
    series: series.map((s, i) => ({
      name: s.name,
      type: "line" as const,
      data: s.data,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: COLORS[i % COLORS.length] },
      itemStyle: { color: COLORS[i % COLORS.length] },
    })),
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>Tool Timeline (Top 5)</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <EChart option={option} style={{ height: 250 }} />
      </CardContent>
    </Card>
  );
}
