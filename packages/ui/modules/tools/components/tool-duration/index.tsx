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
import type { ToolDurationProps } from "./types";

export function ToolDuration({ timeRange }: ToolDurationProps) {
  const { data, isLoading, error, refetch } = useService(timeRange);

  if (isLoading) return <CardLoading showTitle />;
  if (error)
    return (
      <CardError
        title="Avg Duration"
        message="Failed to load data"
        onRetry={() => refetch()}
      />
    );
  if (data.length === 0)
    return <CardEmpty title="Avg Duration" message="No data" />;

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      borderColor: "transparent",
      axisPointer: { type: "shadow" },
    },
    grid: { top: 10, right: 20, bottom: 0, left: 0, outerBoundsMode: "same" },
    xAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: resolveChartColorAlpha("--border", 0.5) },
      },
      axisLabel: { formatter: "{value}ms" },
    },
    yAxis: {
      type: "category",
      data: data.map((d) => d.toolName),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: data.map((d) => d.avgDurationMs ?? 0),
        itemStyle: {
          color: resolveChartColor("--chart-3"),
          borderRadius: [0, 4, 4, 0],
        },
        barMaxWidth: 20,
      },
    ],
  };

  const height = Math.max(200, data.length * 32 + 40);

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>Avg Duration</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <EChart option={option} style={{ height }} />
      </CardContent>
    </Card>
  );
}
