"use client";

import { Wrench } from "lucide-react";
import type { WrappedData } from "@/generated/typeshare-types";

export function FavoriteTool({ data }: { data: WrappedData }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center justify-center size-10 rounded-xl bg-chart-1/10">
        <Wrench className="size-5 text-chart-1" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Favorite tool</p>
        <p className="text-lg font-semibold truncate">{data.topTool}</p>
      </div>
      <span className="text-sm font-medium tabular-nums text-muted-foreground">
        {data.topToolCount.toLocaleString()}x
      </span>
    </div>
  );
}
