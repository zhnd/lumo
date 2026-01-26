"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardLoading } from "@/components/card-loading";
import { CardError } from "@/components/card-error";
import { CardEmpty } from "@/components/card-empty";
import { useService } from "./use-service";
import type { ModelBreakdownProps } from "./types";
import { formatCost } from "../../libs";

const MODEL_COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
] as const;

export function ModelBreakdown({ timeRange }: ModelBreakdownProps) {
  const { data, totalCost, isLoading, error, refetch } = useService(timeRange);

  if (isLoading) {
    return <CardLoading showTitle className="h-full" />;
  }

  if (error) {
    return (
      <CardError
        title="Model Breakdown"
        message="Failed to load model data"
        onRetry={() => refetch()}
        className="h-full"
      />
    );
  }

  if (data.length === 0) {
    return (
      <CardEmpty
        title="Model Breakdown"
        message="No model data available"
        className="h-full"
      />
    );
  }

  const maxCost = Math.max(...data.map((m) => m.cost));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle>Model Breakdown</CardTitle>
        <CardDescription>Total: {formatCost(totalCost)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((model, index) => {
          const percentage = maxCost > 0 ? (model.cost / maxCost) * 100 : 0;
          const colorClass = MODEL_COLORS[index % MODEL_COLORS.length];

          return (
            <div key={model.model} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{model.displayName}</span>
                <span className="text-sm font-semibold">
                  {formatCost(model.cost)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${colorClass}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {model.requests} requests
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
