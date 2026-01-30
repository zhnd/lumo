"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EChart, resolveChartColor, resolveChartColorAlpha } from "@/components/echarts";
import type { EChartsOption } from "@/components/echarts";
import { CardLoading } from "@/components/card-loading";
import { CardError } from "@/components/card-error";
import { useService } from "./use-service";
import type { PeakHoursChartProps } from "./types";

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
    },
    grid: { top: 10, right: 10, bottom: 0, left: 0, outerBoundsMode: "same" },
    xAxis: {
      type: "category",
      data: data.map((d) => d.hour.toString().padStart(2, "0")),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        interval: 2,
      },
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
