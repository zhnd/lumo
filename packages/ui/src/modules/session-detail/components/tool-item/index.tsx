"use client";

import type { TimelineToolItem } from "../../types";
import { CollapsibleTool } from "./collapsible-tool";
import { CompactTool } from "./compact-tool";
import { COMPACT_TOOLS, INLINE_TOOLS } from "./constants";
import { InlineTool } from "./inline-tool";

interface ToolItemProps {
  item: TimelineToolItem;
}

/**
 * Route tool items to the appropriate renderer based on tool type:
 * - Inline (Edit/Write/Bash): content directly visible
 * - Compact (Read/Search): single muted line
 * - Collapsible (Agent/MCP/other): lightweight expandable
 */
export function ToolItem({ item }: ToolItemProps) {
  if (INLINE_TOOLS.has(item.toolName)) {
    return <InlineTool item={item} />;
  }
  if (COMPACT_TOOLS.has(item.toolName)) {
    return <CompactTool item={item} />;
  }
  return <CollapsibleTool item={item} />;
}
