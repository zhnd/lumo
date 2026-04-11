"use client";

import type { TimelineToolItem } from "../../types";
import { formatToolInput } from "../shared/text-utils";

interface CompactToolProps {
  item: TimelineToolItem;
}

/**
 * Compact tool rendering for Read, Search, Glob, etc.
 * Single muted line — minimal visual weight.
 */
export function CompactTool({ item }: CompactToolProps) {
  const summary = item.input
    ? formatToolInput(item.input)
    : (item.filePath ?? "");

  return (
    <div className="px-4 py-0.5 md:px-6">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
        <span className="shrink-0 font-medium">{item.toolName}</span>
        <span className="min-w-0 truncate font-mono">{summary}</span>
      </div>
    </div>
  );
}
