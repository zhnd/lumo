"use client";

import { CardError } from "@/components/card-error";
import { CardLoading } from "@/components/card-loading";
import type { EChartsOption } from "@/components/echarts";
import {
  EChart,
  resolveChartColor,
  resolveChartColorAlpha,
} from "@/components/echarts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PeakHoursChartProps } from "./types";
import { useService } from "./use-service";

export function PeakHoursChart({ timeRange }: PeakHoursChartProps) {
  const { data, peakHour, isLoading, error, refetch } = useService(timeRange);

  if (isLoading) return <CardLoading showTitle />;
  if (error)
    return (
      <CardError
        title="Peak Hours"
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
        return `<div style="font-weight:600;margin-bottom:4px">${item.name}</div>${item.value} requests`;
      },
    },
    grid: { top: 10, right: 10, bottom: 0, left: 0, outerBoundsMode: "same" },
    xAxis: {
      type: "category",
      data: data.map((d) => `${d.hour.toString().padStart(2, "0")}:00`),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        interval: 5,
      },
    },
    yAxis: {
      type: "value",
      name: "Requests",
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
    },
    series: [
      {
        type: "bar",
        data: data.map((d) => ({
          value: d.count,
          itemStyle: {
            color:
              d.hour === peakHour
                ? resolveChartColor("--chart-2")
                : resolveChartColor("--chart-1"),
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barMaxWidth: 20,
      },
    ],
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>Peak Hours</CardTitle>
        <CardDescription>
          Most active at {peakHour.toString().padStart(2, "0")}:00
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <EChart option={option} style={{ height: 220 }} />
      </CardContent>
    </Card>
  );
}
