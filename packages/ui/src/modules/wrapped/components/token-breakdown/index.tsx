"use client";

import type { WrappedData } from "@/generated/typeshare-types";
import { fmt } from "@/lib/format";

const TOKEN_CATEGORIES = [
  { key: "inputTokens", label: "Input", color: "hsl(var(--chart-1))" },
  { key: "outputTokens", label: "Output", color: "hsl(var(--chart-2))" },
  { key: "cacheReadTokens", label: "Cache Read", color: "hsl(var(--chart-3))" },
  {
    key: "cacheCreationTokens",
    label: "Cache Write",
    color: "hsl(var(--chart-4))",
  },
] as const;

export function TokenBreakdownChart({ data }: { data: WrappedData }) {
  const breakdown = data.tokenBreakdown;
  const entries = TOKEN_CATEGORIES.map((cat) => ({
    ...cat,
    value: breakdown[cat.key] as number,
  })).filter((e) => e.value > 0);

  const max = entries.length > 0 ? Math.max(...entries.map((e) => e.value)) : 1;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Token breakdown</p>
      <div className="flex flex-col gap-2">
        {entries.map((entry) => {
          const pct = Math.max((entry.value / max) * 100, 8);
          return (
            <div key={entry.key} className="flex items-center gap-3">
              <span className="text-sm font-medium w-24 text-right truncate">
                {entry.label}
              </span>
              <div className="flex-1 h-6 rounded bg-muted overflow-hidden">
                <div
                  className="h-full rounded transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: entry.color,
                  }}
                />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">
                {fmt(entry.value, "number")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
