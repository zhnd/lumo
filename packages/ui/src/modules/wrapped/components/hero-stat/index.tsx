"use client";

import { Clock, Zap } from "lucide-react";
import type { WrappedData } from "@/generated/typeshare-types";

function formatActiveTime(hours: number): { value: string; unit: string } {
  if (hours >= 1) {
    return { value: hours.toFixed(1), unit: "hours" };
  }
  const minutes = Math.round(hours * 60);
  return { value: String(minutes), unit: "min" };
}

export function HeroStat({ data }: { data: WrappedData }) {
  const time = formatActiveTime(data.totalActiveHours);

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <p className="text-sm text-muted-foreground tracking-wide">
        You&apos;ve collaborated with Claude for
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-extrabold tabular-nums bg-gradient-to-r from-chart-1 to-chart-2 bg-clip-text text-transparent sm:text-5xl">
          {time.value}
        </span>
        <span className="text-xl font-medium text-muted-foreground">
          {time.unit}
        </span>
      </div>
      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Zap className="size-3.5 text-chart-4" />
          {data.totalSessions} sessions
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-chart-3" />~
          {(
            (data.totalActiveHours / Math.max(data.totalSessions, 1)) *
            60
          ).toFixed(0)}{" "}
          min/session
        </span>
      </div>
    </div>
  );
}
