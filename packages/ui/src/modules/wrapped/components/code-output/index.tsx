"use client";

import { Code, GitCommitHorizontal } from "lucide-react";
import type { WrappedData } from "@/generated/typeshare-types";
import { fmt } from "@/lib/format";

export function CodeOutput({ data }: { data: WrappedData }) {
  const totalLines = data.linesOfCodeAdded + data.linesOfCodeRemoved;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-10 rounded-xl bg-chart-2/10">
          <Code className="size-5 text-chart-2" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Lines changed</p>
          <p className="text-lg font-semibold">{fmt(totalLines, "number")}</p>
        </div>
        <div className="flex items-center gap-2 text-sm tabular-nums">
          <span className="text-green-600 dark:text-green-400">
            +{fmt(data.linesOfCodeAdded, "number")}
          </span>
          <span className="text-red-600 dark:text-red-400">
            -{fmt(data.linesOfCodeRemoved, "number")}
          </span>
        </div>
      </div>

      {data.commits > 0 && (
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-10 rounded-xl bg-chart-3/10">
            <GitCommitHorizontal className="size-5 text-chart-3" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Commits</p>
            <p className="text-lg font-semibold">
              {data.commits} commit{data.commits !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
