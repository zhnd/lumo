"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { TimelineToolItem } from "../../types";
import { formatToolInput } from "../shared/text-utils";
import { ToolAgent } from "../tool-viewers/tool-agent";
import { ToolGeneric } from "../tool-viewers/tool-generic";
import { ToolMcp } from "../tool-viewers/tool-mcp";

interface CollapsibleToolProps {
  item: TimelineToolItem;
}

/**
 * Lightweight collapsible for Agent, MCP, and unknown tools.
 * No card border — just an expandable text block.
 */
export function CollapsibleTool({ item }: CollapsibleToolProps) {
  const [expanded, setExpanded] = useState(false);

  const summary = item.input
    ? formatToolInput(item.input)
    : (item.filePath ?? "");
  const preview = summary.length > 80 ? `${summary.slice(0, 80)}...` : summary;

  return (
    <section className="px-4 py-1 md:px-6">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left text-[11px] text-muted-foreground/60 hover:text-muted-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="shrink-0 font-medium">{item.toolName}</span>
        <span className="min-w-0 flex-1 truncate font-mono">{preview}</span>
        {expanded ? (
          <ChevronDown className="size-3 shrink-0" />
        ) : (
          <ChevronRight className="size-3 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="mt-1.5 pl-4">
          <CollapsibleContent item={item} />
        </div>
      )}
    </section>
  );
}

function CollapsibleContent({ item }: { item: TimelineToolItem }) {
  if (item.toolName === "Agent") {
    return <ToolAgent input={item.input} output={item.output} />;
  }
  if (item.toolName.startsWith("mcp__")) {
    return (
      <ToolMcp
        toolName={item.toolName}
        input={item.input}
        output={item.output}
      />
    );
  }
  return (
    <ToolGeneric
      toolName={item.toolName}
      input={item.input}
      output={item.output}
    />
  );
}
