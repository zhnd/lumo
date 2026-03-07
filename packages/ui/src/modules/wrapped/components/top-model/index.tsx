"use client";

import { Crown } from "lucide-react";
import type { WrappedData } from "@/generated/typeshare-types";

export function TopModel({ data }: { data: WrappedData }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center justify-center size-10 rounded-xl bg-chart-4/10">
        <Crown className="size-5 text-chart-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Go-to model</p>
        <p className="text-lg font-semibold truncate">{data.topModel}</p>
      </div>
      <span className="text-sm font-medium tabular-nums text-muted-foreground">
        {data.topModelPercentage.toFixed(0)}%
      </span>
    </div>
  );
}
