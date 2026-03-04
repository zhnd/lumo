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
import { CardEmpty } from "@/components/card-empty";
import { useService } from "./use-service";
import type { ToolFrequencyBarProps } from "./types";

export function ToolFrequencyBar({ timeRange }: ToolFrequencyBarProps) {
  const { data, isLoading, error, refetch } = useService(timeRange);

  if (isLoading) return <CardLoading showTitle />;
  if (error)
    return (
      <CardError
        title="Tool Usage"
        message="Failed to load data"
        onRetry={() => refetch()}
      />
    );
  if (data.length === 0)
    return <CardEmpty title="Tool Usage" message="No tool data" />;

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, 10);

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      borderColor: "transparent",
      formatter: (params: unknown) => {
        const items = params as Array<{ name: string; value: number }>;
        if (!Array.isArray(items) || items.length === 0) return "";
        const item = top.find((d) => d.toolName === items[0].name);
        if (!item) return items[0].name;
        const rate = item.count > 0 ? (item.successes / item.count) * 100 : 0;
        return `${item.toolName}<br/>Uses: ${item.count}<br/>Success: ${rate.toFixed(1)}%`;
      },
    },
    grid: { top: 10, right: 20, bottom: 0, left: 0, outerBoundsMode: "same" },
    xAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: resolveChartColorAlpha("--border", 0.5) },
      },
    },
    yAxis: {
      type: "category",
      data: top.map((d) => d.toolName),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: "Uses",
        type: "bar",
        data: top.map((d) => d.count),
        barMaxWidth: 20,
        itemStyle: {
          color: resolveChartColor("--chart-1"),
          borderRadius: [0, 4, 4, 0],
        },
      },
    ],
  };

  const height = Math.max(220, top.length * 32 + 40);

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>Tool Usage (Top 10)</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <EChart option={option} style={{ height }} />
      </CardContent>
    </Card>
  );
}
