"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EChart, resolveChartColor, resolveChartColorAlpha } from "@/components/echarts";
import type { EChartsOption } from "@/components/echarts";
import { CardLoading } from "@/components/card-loading";
import { CardError } from "@/components/card-error";
import { useService } from "./use-service";
import type { CacheHitTrendProps } from "./types";

export function CacheHitTrend({ timeRange }: CacheHitTrendProps) {
  const { data, isLoading, error, refetch } = useService(timeRange);

  if (isLoading) return <CardLoading showTitle />;
  if (error)
    return (
      <CardError
        title="Cache Hit Rate"
        message="Failed to load data"
        onRetry={() => refetch()}
      />
    );

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      borderColor: "transparent",
      formatter: (params: unknown) => {
        const items = params as Array<{
          name: string;
          value: number;
        }>;
        if (!Array.isArray(items) || items.length === 0) return "";
        const item = items[0];
        return `<div style="font-weight:600;margin-bottom:4px">${item.name}</div>${item.value.toFixed(1)}%`;
      },
    },
    grid: { top: 10, right: 10, bottom: 0, left: 0, containLabel: true },
    xAxis: {
      type: "category",
      data: data.map((d) => d.date),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        interval: "auto",
        color: resolveChartColor("--muted-foreground"),
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      name: "Cache Hit %",
      nameLocation: "end",
      nameTextStyle: {
        color: resolveChartColor("--muted-foreground"),
        fontSize: 11,
        padding: [0, 0, 0, 4],
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: resolveChartColorAlpha("--border", 0.5) },
      },
      axisLabel: {
        formatter: "{value}%",
      },
    },
    series: [
      {
        type: "line",
        data: data.map((d) => d.rate),
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: {
          color: resolveChartColor("--chart-3"),
          width: 2,
        },
        itemStyle: {
          color: resolveChartColor("--chart-3"),
        },
        areaStyle: {
          color: resolveChartColorAlpha("--chart-3", 0.1),
        },
      },
    ],
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>Cache Hit Rate</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <EChart option={option} style={{ height: 220 }} />
      </CardContent>
    </Card>
  );
}
