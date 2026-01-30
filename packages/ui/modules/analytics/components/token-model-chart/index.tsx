"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EChart, resolveChartColor } from "@/components/echarts";
import type { EChartsOption } from "@/components/echarts";
import { CardLoading } from "@/components/card-loading";
import { CardError } from "@/components/card-error";
import { CardEmpty } from "@/components/card-empty";
import { useService } from "./use-service";
import type { TokenModelChartProps } from "./types";

export function TokenModelChart({ timeRange }: TokenModelChartProps) {
  const { data, isLoading, error, refetch } = useService(timeRange);

  if (isLoading) return <CardLoading showTitle />;
  if (error)
    return (
      <CardError
        title="Token Usage by Model"
        message="Failed to load data"
        onRetry={() => refetch()}
      />
    );
  if (data.length === 0)
    return <CardEmpty title="Token Usage by Model" message="No token data" />;

  const models = data.map((d) => d.displayName || d.model);

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      borderColor: "transparent",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const model = params[0]?.name ?? "";
        const lines = params.map(
          (p: any) =>
            `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}: ${p.value.toLocaleString()}`,
        );
        return `<b>${model}</b><br/>${lines.join("<br/>")}`;
      },
    },
    legend: {
      bottom: 0,
      textStyle: { color: resolveChartColor("--muted-foreground"), fontSize: 11 },
      itemWidth: 12,
      itemHeight: 12,
    },
    grid: { top: 10, right: 20, bottom: 40, left: 0, containLabel: true },
    yAxis: {
      type: "category",
      data: models,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: resolveChartColor("--muted-foreground") },
    },
    xAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: resolveChartColor("--border"), opacity: 0.5 },
      },
      axisLabel: {
        color: resolveChartColor("--muted-foreground"),
        formatter: (v: number) => {
          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
          if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
          return String(v);
        },
      },
    },
    series: [
      {
        name: "Input",
        type: "bar",
        stack: "tokens",
        data: data.map((d) => d.input),
        itemStyle: { color: resolveChartColor("--chart-1"), borderRadius: 0 },
        barMaxWidth: 28,
      },
      {
        name: "Output",
        type: "bar",
        stack: "tokens",
        data: data.map((d) => d.output),
        itemStyle: { color: resolveChartColor("--chart-2") },
        barMaxWidth: 28,
      },
      {
        name: "Cache Read",
        type: "bar",
        stack: "tokens",
        data: data.map((d) => d.cacheRead),
        itemStyle: { color: resolveChartColor("--chart-3") },
        barMaxWidth: 28,
      },
      {
        name: "Cache Create",
        type: "bar",
        stack: "tokens",
        data: data.map((d) => d.cacheCreation),
        itemStyle: {
          color: resolveChartColor("--chart-4"),
          borderRadius: [0, 4, 4, 0],
        },
        barMaxWidth: 28,
      },
    ],
  };

  const height = Math.max(160, data.length * 48 + 60);

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>Token Usage by Model</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <EChart option={option} style={{ height }} />
      </CardContent>
    </Card>
  );
}
