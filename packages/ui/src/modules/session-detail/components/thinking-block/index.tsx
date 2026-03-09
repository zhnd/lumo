"use client";

import { Brain, ChevronDown, ChevronRight, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TimelineThinkingItem } from "../../types";

interface ThinkingBlockProps {
  item: TimelineThinkingItem;
}

export function ThinkingBlock({ item }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="px-4 py-1 md:px-6">
      <div className="rounded-lg border border-dashed border-border bg-muted/20">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {item.redacted ? (
            <EyeOff className="size-3.5 shrink-0" />
          ) : (
            <Brain className="size-3.5 shrink-0" />
          )}
          <span className="font-medium">
            {item.redacted ? "Redacted thinking" : "Thinking"}
          </span>
          {expanded ? (
            <ChevronDown className="ml-auto size-3.5 shrink-0" />
          ) : (
            <ChevronRight className="ml-auto size-3.5 shrink-0" />
          )}
        </button>
        {expanded && (
          <div
            className={cn(
              "max-h-[400px] overflow-auto border-t border-dashed border-border px-3 py-2",
            )}
          >
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-muted-foreground">
              {item.text}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}
