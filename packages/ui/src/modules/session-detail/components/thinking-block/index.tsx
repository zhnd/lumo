"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { TimelineThinkingItem } from "../../types";

interface ThinkingBlockProps {
  item: TimelineThinkingItem;
}

export function ThinkingBlock({ item }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="px-4 py-0.5 md:px-6">
      <button
        type="button"
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-medium">
          {item.redacted ? "Redacted thinking" : "Thinking"}
        </span>
        {expanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
      </button>
      {expanded && (
        <div className="mt-1 max-h-[400px] overflow-auto pl-4">
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] italic text-muted-foreground/60">
            {item.text}
          </pre>
        </div>
      )}
    </section>
  );
}
