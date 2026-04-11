"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { TimelineToolGroupItem } from "../../types";
import { CompactTool } from "../tool-item/compact-tool";

const GROUP_LABELS: Record<string, (n: number) => string> = {
  read: (n) => `Read ${n} files`,
  search: (n) => `Searched ${n} patterns`,
};

interface ToolGroupProps {
  item: TimelineToolGroupItem;
}

/**
 * Collapsed group of consecutive Read or Search tools.
 * Renders as a single muted line; expands to show individual compact items.
 */
export function ToolGroup({ item }: ToolGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const label =
    GROUP_LABELS[item.category]?.(item.items.length) ??
    `${item.items.length} tool calls`;

  return (
    <div className="px-4 py-0.5 md:px-6">
      <button
        type="button"
        className="flex items-center gap-2 text-[11px] text-muted-foreground/50 hover:text-muted-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-medium">{label}</span>
        {expanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
      </button>

      {expanded && (
        <div className="mt-0.5">
          {item.items.map((tool) => (
            <CompactTool key={tool.id} item={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
