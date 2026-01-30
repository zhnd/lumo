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

const PALETTE_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"] as const;

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

  const bgColor = resolveChartColor("--background");
  const palette = PALETTE_VARS.map((v) => resolveChartColor(v));

  const sorted = [...data].sort((a, b) => b.count - a.count);

  const treemapData = sorted.map((d, i) => ({
    name: d.toolName,
    value: d.count,
    itemStyle: {
      color: palette[i % palette.length],
      borderColor: bgColor,
      borderWidth: 2,
      borderRadius: 4,
    },
  }));

  const option: EChartsOption = {
    tooltip: {
      borderColor: "transparent",
      formatter: (params: any) => {
        const item = data.find((d) => d.toolName === params.name);
        if (!item) return params.name;
        const rate =
          item.count > 0
            ? ((item.successes / item.count) * 100).toFixed(1)
            : "0";
        return `${params.name}<br/>Uses: ${item.count}<br/>Success: ${rate}%`;
      },
    },
    series: [
      {
        type: "treemap",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        data: treemapData,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          color: "#fff",
          fontSize: 12,
          formatter: "{b}\n{c}",
        },
        levels: [
          {
            itemStyle: {
              gapWidth: 2,
            },
          },
        ],
      },
    ],
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>Tool Usage Frequency</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <EChart option={option} style={{ height: 280 }} />
      </CardContent>
    </Card>
  );
}
