"use client";

import { Database } from "lucide-react";
import type { WrappedData } from "@/generated/typeshare-types";
import { fmt } from "@/lib/format";

export function TokensConsumed({ data }: { data: WrappedData }) {
  const novels = Math.floor(data.totalTokens / (250 * 300));

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center justify-center size-10 rounded-xl bg-[hsl(var(--chart-2))]/10">
        <Database className="size-5 text-[hsl(var(--chart-2))]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Tokens consumed</p>
        <p className="text-lg font-semibold">{fmt(data.totalTokens, "number")}</p>
      </div>
      {novels > 0 && (
        <span className="text-xs text-muted-foreground">
          ~{novels} novel{novels > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
