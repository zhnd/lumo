"use client";

import { cn } from "@/lib/utils";
import type { ExtraUsageCardProps } from "./types";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ExtraUsageCard({ extra }: ExtraUsageCardProps) {
  const percent = Math.round(extra.utilization ?? 0);
  const barColor =
    percent >= 90
      ? "bg-red-500"
      : percent >= 70
        ? "bg-amber-500"
        : "bg-chart-1";
  const textColor =
    percent >= 90
      ? "text-red-600 dark:text-red-400"
      : percent >= 70
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {extra.usedCredits != null
                ? `${formatCents(extra.usedCredits)} spent`
                : "Extra usage"}
            </p>
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

      {/* Monthly limit */}
      {extra.monthlyLimit != null && (
        <div>
          <p className="text-sm font-medium">
            {formatCents(extra.monthlyLimit)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Monthly spend limit
          </p>
        </div>
      )}
    </div>
  );
}
