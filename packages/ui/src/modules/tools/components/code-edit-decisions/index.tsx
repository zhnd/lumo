"use client";

import { CardChartEmpty } from "@/components/card-chart-empty";
import { CardError } from "@/components/card-error";
import { CardLoading } from "@/components/card-loading";
import type { EChartsOption } from "@/components/echarts";
import { EChart, resolveChartColor } from "@/components/echarts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CodeEditDecisionsProps } from "./types";
import { useService } from "./use-service";

export function CodeEditDecisions({ timeRange }: CodeEditDecisionsProps) {
  const { data, totalAccepts, totalRejects, isLoading, error, refetch } =
    useService(timeRange);

  if (isLoading) return <CardLoading showTitle />;
  if (error)
    return (
      <CardError
        title="Code Edit Decisions"
        message="Failed to load data"
        onRetry={() => refetch()}
      />
    );
  if (totalAccepts + totalRejects === 0) {
    return (
      <CardChartEmpty
        title="Code Edit Decisions"
        chartType="pie"
        height={200}
      />
    );
  }

  const donutOption: EChartsOption = {
    tooltip: { trigger: "item", borderColor: "transparent" },
    series: [
      {
        type: "pie",
        radius: ["50%", "75%"],
        data: [
          {
            name: "Accept",
            value: totalAccepts,
            itemStyle: { color: resolveChartColor("--chart-1") },
          },
          {
            name: "Reject",
            value: totalRejects,
            itemStyle: { color: resolveChartColor("--chart-5") },
          },
        ],
        label: { show: false },
      },
    ],
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>Code Edit Decisions</CardTitle>
        <CardDescription>
          {totalAccepts} accepted / {totalRejects} rejected
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid gap-4 md:grid-cols-2">
          <EChart option={donutOption} style={{ height: 200 }} />
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            <p className="text-sm font-medium text-muted-foreground sticky top-0 bg-card pb-1">
              By Language
            </p>
            {data.slice(0, 10).map((d) => {
              const total = d.accepts + d.rejects;
              const rate = total > 0 ? (d.accepts / total) * 100 : 0;
              return (
                <div
                  key={d.language}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{d.language}</span>
                  <div className="flex gap-3 text-muted-foreground">
                    <span className="text-green-500">{d.accepts}</span>
                    <span className="text-red-500">{d.rejects}</span>
                    <span className="w-12 text-right">{rate.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
