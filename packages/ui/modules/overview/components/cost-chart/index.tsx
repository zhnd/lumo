"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EChart, resolveChartColor } from "@/components/echarts";
import type { EChartsOption } from "@/components/echarts";
import { CardLoading } from "@/components/card-loading";
import { CardError } from "@/components/card-error";
import { CardEmpty } from "@/components/card-empty";
import { useService } from "./use-service";
import type { CostChartProps } from "./types";
import { TimeRange } from "@/src/generated/typeshare-types";
import { fmt } from "@/lib/format";

function shortenModel(model: string): string {
  const match = model.match(/claude-(\w+)-([\d-]+)/);
  if (!match) return model;
  const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  const version = match[2].replace(/-\d{8}$/, "").replace(/-/g, ".");
  return `${name} ${version}`;
}

export function CostChart({ timeRange }: CostChartProps) {
  const { dates, models, seriesMap, totalCost, isLoading, error, refetch } =
    useService(timeRange);

  if (isLoading) {
    return <CardLoading showTitle className="h-full" />;
  }

  if (error) {
    return (
      <CardError
        title="Cost Trends"
        message="Failed to load cost data"
        onRetry={() => refetch()}
        className="h-full"
      />
    );
  }

  if (dates.length === 0) {
    return (
      <CardEmpty
        title="Cost Trends"
        message="No cost data available"
        className="h-full"
      />
    );
  }

  const mutedColor = resolveChartColor("--muted-foreground");

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      borderColor: "transparent",
      order: "valueDesc",
      formatter: (params: unknown) => {
        const items = params as Array<{
          seriesName: string;
          value: number;
          color: string;
          axisValueLabel: string;
        }>;
        if (!Array.isArray(items) || items.length === 0) return "";
        let total = 0;
        const lines = items.map((item) => {
          total += item.value ?? 0;
          return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${item.color};margin-right:6px;"></span>${item.seriesName}: <b>$${(item.value ?? 0).toFixed(2)}</b>`;
        });
        return `<div style="font-weight:600;margin-bottom:6px">${items[0].axisValueLabel} — Total: $${total.toFixed(2)}</div>${lines.join("<br/>")}`;
      },
    },
    legend: {
      data: models.map(shortenModel),
      bottom: 0,
      textStyle: { color: mutedColor },
    },
    grid: {
      top: 10,
      right: 10,
      bottom: 30,
      left: 0,
      outerBoundsMode: "same",
    },
    xAxis: {
      type: "category",
      data: dates.map((d) =>
        timeRange === TimeRange.Today ? d : d.slice(5),
      ),
    },
    yAxis: {
      type: "value",
    },
    series: models.map((model, i) => {
      const dataMap = seriesMap.get(model)!;
      const color = resolveChartColor(`--chart-${(i % 5) + 1}`);
      return {
        name: shortenModel(model),
        type: "line" as const,
        stack: "cost",
        data: dates.map((d) => dataMap.get(d) ?? 0),
        smooth: true,
        showSymbol: dates.length <= 3,
        symbolSize: 6,
        lineStyle: { width: 1.5, color },
        itemStyle: { color },
        areaStyle: { opacity: 0.18 },
        emphasis: { focus: "series" as const },
      };
    }),
  };

  return (
    <Card className="h-full gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>Cost Trends</CardTitle>
        <CardDescription>Total: {fmt(totalCost, "currency")}</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <EChart option={option} style={{ height: 250 }} />
      </CardContent>
    </Card>
  );
}
