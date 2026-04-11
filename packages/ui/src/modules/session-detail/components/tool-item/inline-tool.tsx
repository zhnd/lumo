"use client";

import { AlertCircle } from "lucide-react";
import type { TimelineToolItem } from "../../types";
import { ToolBash } from "../tool-viewers/tool-bash";
import { ToolEdit } from "../tool-viewers/tool-edit";
import { ToolWrite } from "../tool-viewers/tool-write";
import { isPlanFile, resolveFilePath, shortenPath } from "./constants";

interface InlineToolProps {
  item: TimelineToolItem;
}

/**
 * Inline tool rendering for Edit, Write, and Bash.
 * Content is directly visible — no card, no collapse.
 */
export function InlineTool({ item }: InlineToolProps) {
  const filePath = resolveFilePath(item.filePath, item.input);
  const displayPath = filePath ? shortenPath(filePath) : undefined;
  const isPlan = isPlanFile(filePath);
  const label = isPlan
    ? item.toolName === "Edit"
      ? "Updated plan"
      : "Created plan"
    : item.toolName;

  return (
    <section className="px-4 py-1.5 md:px-6">
      {/* Header: tool name + file path */}
      {(item.toolName !== "Bash" || displayPath) && (
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground/70">
            {label}
          </span>
          {displayPath && (
            <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground/50">
              {displayPath}
            </span>
          )}
          {item.isError && (
            <AlertCircle className="size-3 shrink-0 text-destructive/70" />
          )}
        </div>
      )}

      {/* Content: directly visible */}
      <InlineContent item={item} />
    </section>
  );
}

function InlineContent({ item }: { item: TimelineToolItem }) {
  switch (item.toolName) {
    case "Edit":
      return (
        <ToolEdit
          input={item.input}
          output={item.output}
          filePath={item.filePath}
          fileContent={item.fileContent}
        />
      );
    case "Write":
    case "NotebookEdit":
      return (
        <ToolWrite
          input={item.input}
          output={item.output}
          toolName={item.toolName}
          filePath={item.filePath}
          fileContent={item.fileContent}
        />
      );
    case "Bash":
      return (
        <ToolBash
          input={item.input}
          output={item.output}
          isError={item.isError}
        />
      );
    default:
      return null;
  }
}
