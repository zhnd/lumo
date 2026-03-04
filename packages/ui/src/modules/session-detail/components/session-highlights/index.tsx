"use client";

import { FilePenLine, Wrench, ListChecks, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { SessionHighlightsProps } from "./types";

function HighlightMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

export function SessionHighlights({ highlights }: SessionHighlightsProps) {
  return (
    <section className="border-b px-4 py-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">Session Highlights</div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <HighlightMetric
          label="Tool Calls"
          value={String(highlights.toolCalls)}
          icon={<Wrench className="size-3.5" />}
        />
        <HighlightMetric
          label="Tool Results"
          value={String(highlights.toolResults)}
          icon={<ListChecks className="size-3.5" />}
        />
        <HighlightMetric
          label="Failures"
          value={String(highlights.failureCount)}
          icon={<TriangleAlert className="size-3.5" />}
        />
        <HighlightMetric
          label="Touched Files"
          value={String(highlights.touchedFiles)}
          icon={<FilePenLine className="size-3.5" />}
        />
      </div>
    </section>
  );
}
