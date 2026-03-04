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
import type { ToolSuccessRateProps } from "./types";

export function ToolSuccessRate({ timeRange }: ToolSuccessRateProps) {
  const { data, isLoading, error, refetch } = useService(timeRange);

  if (isLoading) return <CardLoading showTitle />;
  if (error)
    return (
      <CardError
        title="Success Rate"
        message="Failed to load data"
        onRetry={() => refetch()}
      />
    );
  if (data.length === 0)
    return <CardEmpty title="Success Rate" message="No data" />;

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      borderColor: "transparent",
      axisPointer: { type: "shadow" },
    },
    legend: {
      data: ["Success", "Failure"],
      bottom: 0,
      textStyle: { color: resolveChartColor("--muted-foreground") },
    },
    grid: { top: 10, right: 20, bottom: 30, left: 0, outerBoundsMode: "same" },
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
      data: data.map((d) => d.toolName),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: "Success",
        type: "bar",
        stack: "total",
        data: data.map((d) => d.successes),
        itemStyle: { color: resolveChartColor("--chart-1") },
        barMaxWidth: 20,
      },
      {
        name: "Failure",
        type: "bar",
        stack: "total",
        data: data.map((d) => d.failures),
        itemStyle: { color: resolveChartColor("--chart-5") },
        barMaxWidth: 20,
      },
    ],
  };

  const height = Math.max(200, data.length * 32 + 50);

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>Success Rate</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <EChart option={option} style={{ height }} />
      </CardContent>
    </Card>
  );
}
