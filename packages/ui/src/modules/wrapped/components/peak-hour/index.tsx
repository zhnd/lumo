"use client";

import { Moon, Sun } from "lucide-react";
import type { WrappedData } from "@/generated/typeshare-types";

export function PeakHour({ data }: { data: WrappedData }) {
  const isNightOwl = data.peakHour >= 22 || data.peakHour < 5;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center justify-center size-10 rounded-xl bg-chart-5/10">
        {isNightOwl ? (
          <Moon className="size-5 text-chart-5" />
        ) : (
          <Sun className="size-5 text-chart-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Peak hour</p>
        <p className="text-lg font-semibold">{data.peakHourLabel}</p>
      </div>
    </div>
  );
}
