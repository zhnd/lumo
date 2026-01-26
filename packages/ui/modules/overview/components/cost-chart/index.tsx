"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CardLoading } from "@/components/card-loading";
import { CardError } from "@/components/card-error";
import { CardEmpty } from "@/components/card-empty";
import { useService } from "./use-service";
import type { CostChartProps } from "./types";
import { formatCost } from "../../libs";

const chartConfig = {
  cost: {
    label: "Cost",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function CostChart({ timeRange }: CostChartProps) {
  const { data, totalCost, isLoading, error, refetch } = useService(timeRange);

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

  if (data.length === 0) {
    return (
      <CardEmpty
        title="Cost Trends"
        message="No cost data available"
        className="h-full"
      />
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle>Cost Trends</CardTitle>
        <CardDescription>Total: {formatCost(totalCost)}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-cost)"
                  stopOpacity={0.4}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-cost)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--color-cost)"
              strokeOpacity={0.15}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              fontSize={12}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
              tickMargin={5}
              fontSize={12}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <>
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label}
                      </span>
                      <span className="ml-auto font-medium">
                        {formatCost(value as number)}
                      </span>
                    </>
                  )}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="var(--color-cost)"
              strokeWidth={2}
              fill="url(#costGradient)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
