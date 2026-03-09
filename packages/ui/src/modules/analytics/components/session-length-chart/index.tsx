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
import type { SessionLengthChartProps } from "./types";
import { useService } from "./use-service";

export function SessionLengthChart({ timeRange }: SessionLengthChartProps) {
  const { data, isLoading, error, refetch } = useService(timeRange);

  if (isLoading) return <CardLoading showTitle />;
  if (error) {
    return (
      <CardError
        title="Session Length"
        message="Failed to load data"
        onRetry={() => refetch()}
      />
    );
  }
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return <CardChartEmpty title="Session Length Distribution" />;
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      borderColor: "transparent",
    },
    grid: { top: 10, right: 10, bottom: 0, left: 0, outerBoundsMode: "same" },
    xAxis: {
      type: "category",
      data: data.map((d) => d.bucket),
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
    series: [
      {
        type: "bar",
        data: data.map((d) => d.count),
        barMaxWidth: 34,
        itemStyle: {
          color: resolveChartColor("--chart-2"),
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>Session Length Distribution</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <EChart option={option} style={{ height: 220 }} />
      </CardContent>
    </Card>
  );
}
