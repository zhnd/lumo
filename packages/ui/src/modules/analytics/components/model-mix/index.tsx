"use client";

import { CardChartEmpty } from "@/components/card-chart-empty";
import { CardError } from "@/components/card-error";
import { CardLoading } from "@/components/card-loading";
import type { EChartsOption } from "@/components/echarts";
import { EChart, resolveChartColor } from "@/components/echarts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmt } from "@/lib/format";
import type { ModelMixProps } from "./types";
import { useService } from "./use-service";

export function ModelMix({ timeRange }: ModelMixProps) {
  const COLORS = [
    resolveChartColor("--chart-1"),
    resolveChartColor("--chart-2"),
    resolveChartColor("--chart-3"),
    resolveChartColor("--chart-4"),
    resolveChartColor("--chart-5"),
  ];
  const { data, isLoading, error, refetch } = useService(timeRange);

  if (isLoading) return <CardLoading showTitle />;
  if (error)
    return (
      <CardError
        title="Model Mix"
        message="Failed to load data"
        onRetry={() => refetch()}
      />
    );
  if (data.length === 0) {
    return (
      <CardChartEmpty title="Model Mix" chartType="pie" className="h-full" />
    );
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: "item",
      borderColor: "transparent",
      formatter: (params: unknown) => {
        const item = params as {
          name: string;
          value: number;
          percent: number;
          color: string;
        };
        return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${item.color};margin-right:6px;"></span>${item.name}<br/><b>$${item.value.toFixed(2)}</b> · ${item.percent}%`;
      },
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        data: data.map((d, i) => ({
          name: d.displayName,
          value: d.cost,
          itemStyle: { color: COLORS[i % COLORS.length] },
        })),
        label: { show: false },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.2)",
          },
        },
      },
    ],
  };

  return (
    <Card className="h-full gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>Model Mix</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <EChart option={option} style={{ height: 220 }} />
        <div className="mt-4 space-y-2">
          {data.map((d, i) => (
            <div
              key={d.model}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className="size-3 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span>{d.displayName}</span>
              </div>
              <div className="flex gap-4 text-muted-foreground">
                <span>{fmt(d.cost, "currency")}</span>
                <span>{d.requests} reqs</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
