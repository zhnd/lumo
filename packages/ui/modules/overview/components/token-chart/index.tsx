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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { UsageTrendPoint } from "../../types";
import { formatTokens } from "../../libs";

interface TokenChartProps {
  data: UsageTrendPoint[];
}

const chartConfig = {
  inputTokens: {
    label: "Input",
    color: "hsl(var(--chart-1))",
  },
  outputTokens: {
    label: "Output",
    color: "hsl(var(--chart-2))",
  },
  cacheReadTokens: {
    label: "Cache",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export function TokenChart({ data }: TokenChartProps) {
  const totalTokens = data.reduce(
    (sum, d) => sum + d.inputTokens + d.outputTokens + d.cacheReadTokens,
    0
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle>Token Trends</CardTitle>
        <CardDescription>Total: {formatTokens(totalTokens)}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="inputGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-inputTokens)"
                  stopOpacity={0.4}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-inputTokens)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient id="outputGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-outputTokens)"
                  stopOpacity={0.4}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-outputTokens)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient id="cacheGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-cacheReadTokens)"
                  stopOpacity={0.4}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-cacheReadTokens)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--color-inputTokens)"
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
              tickFormatter={(value) => `${value / 1000}K`}
              tickMargin={5}
              fontSize={12}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <ChartTooltip
              content={<ChartTooltipContent indicator="line" />}
            />
            <ChartLegend
              content={({ payload }) => (
                <div className="flex justify-center gap-4 pt-2">
                  {payload?.map((entry) => (
                    <div key={entry.value} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-muted-foreground">
                        {chartConfig[entry.value as keyof typeof chartConfig]?.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            />
            <Area
              type="monotone"
              dataKey="inputTokens"
              name="inputTokens"
              stroke="var(--color-inputTokens)"
              strokeWidth={2}
              fill="url(#inputGradient)"
            />
            <Area
              type="monotone"
              dataKey="outputTokens"
              name="outputTokens"
              stroke="var(--color-outputTokens)"
              strokeWidth={2}
              fill="url(#outputGradient)"
            />
            <Area
              type="monotone"
              dataKey="cacheReadTokens"
              name="cacheReadTokens"
              stroke="var(--color-cacheReadTokens)"
              strokeWidth={2}
              fill="url(#cacheGradient)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
