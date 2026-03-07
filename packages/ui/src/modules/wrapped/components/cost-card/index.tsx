"use client";

import { DollarSign } from "lucide-react";
import type { WrappedData } from "@/generated/typeshare-types";
import { fmt, formatValue } from "@/lib/format";

export function CostCard({ data }: { data: WrappedData }) {
  const sparkline = data.costSparkline;
  const max = Math.max(...sparkline, 0.01);

  const width = 120;
  const height = 32;
  const points = sparkline
    .map((v, i) => {
      const x = (i / Math.max(sparkline.length - 1, 1)) * width;
      const y = height - (v / max) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const costResult = formatValue(data.totalCost, "currency");

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center justify-center size-10 rounded-xl bg-chart-5/10">
        <DollarSign className="size-5 text-chart-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Total cost</p>
        <p className="text-xs text-muted-foreground mt-1">
          ~{fmt(data.dailyAvgCost, "currency")}/day
          {" · "}
          {fmt(data.costPerSession, "currency")}/session
        </p>
        {sparkline.length > 1 && (
          <svg width={width} height={height} className="mt-1.5">
            <polyline
              points={points}
              fill="none"
              stroke="hsl(var(--chart-5))"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className="flex items-baseline gap-0.5 shrink-0">
        <span className="text-sm font-medium text-muted-foreground">$</span>
        <span className="text-3xl font-extrabold tabular-nums">
          {costResult.value}
        </span>
        {costResult.unit && (
          <span className="text-sm font-medium text-muted-foreground">
            {costResult.unit}
          </span>
        )}
      </div>
    </div>
  );
}
