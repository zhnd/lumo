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
import { useService } from "./use-service";
import type { ErrorRateCardProps } from "./types";

export function ErrorRateCard({ timeRange }: ErrorRateCardProps) {
  const { data, isLoading, error, refetch } = useService(timeRange);

  if (isLoading) return <CardLoading showTitle />;
  if (error) {
    return (
      <CardError
        title="Error Rate"
        message="Failed to load data"
        onRetry={() => refetch()}
      />
    );
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: "item",
      borderColor: "transparent",
    },
    series: [
      {
        type: "pie",
        radius: ["60%", "80%"],
        avoidLabelOverlap: false,
        label: { show: false },
        data: [
          {
            name: "Errors",
            value: data.totalErrors,
            itemStyle: { color: resolveChartColor("--chart-5") },
          },
          {
            name: "Successful Requests",
            value: Math.max(0, data.totalRequests - data.totalErrors),
            itemStyle: { color: resolveChartColor("--chart-1") },
          },
        ],
      },
    ],
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>Error Rate</CardTitle>
        <CardDescription>
          {(data.errorRate * 100).toFixed(2)}% ({data.totalErrors}/{data.totalRequests})
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <EChart option={option} style={{ height: 220 }} />
      </CardContent>
    </Card>
  );
}
