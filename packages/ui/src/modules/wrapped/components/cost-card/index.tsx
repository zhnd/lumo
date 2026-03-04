"use client";

import { DollarSign } from "lucide-react";
import type { WrappedData } from "@/generated/typeshare-types";
import { fmt } from "@/lib/format";

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

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center justify-center size-10 rounded-xl bg-[hsl(var(--chart-5))]/10">
        <DollarSign className="size-5 text-[hsl(var(--chart-5))]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Total investment</p>
        <p className="text-lg font-semibold">{fmt(data.totalCost, "currency")}</p>
        <p className="text-xs text-muted-foreground">
          ~{fmt(data.dailyAvgCost, "currency")}/day
        </p>
      </div>
      {sparkline.length > 1 && (
        <svg width={width} height={height} className="shrink-0">
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
  );
}
