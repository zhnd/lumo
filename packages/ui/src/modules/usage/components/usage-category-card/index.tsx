"use client";

import { cn } from "@/lib/utils";
import type { UsageCategoryCardProps } from "./types";

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

export function UsageCategoryCard({ category }: UsageCategoryCardProps) {
  const barColor = getBarColor(category.percentUsed);
  const textColor = getTextColor(category.percentUsed);
  const isExtra = category.name === "extra_usage";

  return (
    <div className="space-y-4">
      {/* Progress row */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {isExtra && category.amountSpent
                ? `${category.amountSpent} spent`
                : category.label}
            </p>
            {category.resetsIn && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Resets {category.resetsIn}
              </p>
            )}
          </div>
          <span className={cn("shrink-0 text-sm tabular-nums", textColor)}>
            {category.percentUsed}% used
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              barColor,
            )}
            style={{
              width: `${Math.max(Math.min(category.percentUsed, 100), 1)}%`,
            }}
          />
        </div>
      </div>

      {/* Monthly spend limit */}
      {isExtra && category.amountLimit && (
        <div>
          <p className="text-sm font-medium">{category.amountLimit}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Monthly spend limit
          </p>
        </div>
      )}

      {/* Current balance */}
      {isExtra && category.amountBalance && (
        <div>
          <p className="text-sm font-medium">{category.amountBalance}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Current balance
          </p>
        </div>
      )}
    </div>
  );
}
