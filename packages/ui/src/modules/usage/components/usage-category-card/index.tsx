"use client";

import { cn } from "@/lib/utils";
import type { UsageBucketCardProps } from "./types";

function getBarColor(percent: number): string {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 70) return "bg-amber-500";
  return "bg-chart-1";
}

function getTextColor(percent: number): string {
  if (percent >= 90) return "text-red-600 dark:text-red-400";
  if (percent >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function formatRelativeReset(diffMs: number): string {
  if (diffMs <= 0) return "Resetting soon";

  const totalMinutes = Math.ceil(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `in ${days}d ${remainingHours}h`;
  }

  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}

function formatAbsoluteReset(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UsageBucketCard({ label, bucket }: UsageBucketCardProps) {
  const percent = Math.round(bucket.utilization ?? 0);
  const barColor = getBarColor(percent);
  const textColor = getTextColor(percent);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {bucket.resetsAt &&
            (() => {
              const resetDate = new Date(bucket.resetsAt);
              const diffMs = resetDate.getTime() - Date.now();
              return (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Resets {formatRelativeReset(diffMs)}
                  <span className="mx-1">·</span>
                  {formatAbsoluteReset(resetDate)}
                </p>
              );
            })()}
        </div>
        <span className={cn("shrink-0 text-sm tabular-nums", textColor)}>
          {percent}% used
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor,
          )}
          style={{
            width: `${Math.max(Math.min(percent, 100), 1)}%`,
          }}
        />
      </div>
    </div>
  );
}
