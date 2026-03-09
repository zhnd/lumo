"use client";

import {
  ChevronDown,
  ChevronRight,
  Clock3,
  FilePen,
  FilePlus,
  FileSearch,
  FileText,
  Globe,
  Search,
  Terminal,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatMessageTime } from "../../libs";
import type { TimelineToolItem } from "../../types";
import { formatToolInput } from "../shared/text-utils";
import { ToolBash } from "../tool-viewers/tool-bash";
import { ToolEdit } from "../tool-viewers/tool-edit";
import { ToolGeneric } from "../tool-viewers/tool-generic";
import { ToolRead } from "../tool-viewers/tool-read";
import { ToolSearch } from "../tool-viewers/tool-search";
import { ToolWrite } from "../tool-viewers/tool-write";

const TOOL_ICONS: Record<string, React.ReactNode> = {
  Read: <FileText className="size-3.5" />,
  Edit: <FilePen className="size-3.5" />,
  Write: <FilePlus className="size-3.5" />,
  NotebookEdit: <FilePlus className="size-3.5" />,
  Bash: <Terminal className="size-3.5" />,
  Grep: <FileSearch className="size-3.5" />,
  Glob: <FileSearch className="size-3.5" />,
  WebSearch: <Globe className="size-3.5" />,
  WebFetch: <Globe className="size-3.5" />,
  Search: <Search className="size-3.5" />,
};

const SEARCH_TOOLS = new Set(["Grep", "Glob", "WebSearch", "WebFetch"]);

interface ToolItemProps {
  item: TimelineToolItem;
}

export function ToolItem({ item }: ToolItemProps) {
  const [expanded, setExpanded] = useState(!!item.isError);

  const icon = TOOL_ICONS[item.toolName] ?? <Wrench className="size-3.5" />;
  const summary = item.input
    ? formatToolInput(item.input)
    : (item.filePath ?? "");

  return (
    <section className="px-4 py-1 md:px-6">
      <div className="rounded-lg border border-border bg-card/50">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/30"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="shrink-0 text-muted-foreground">{icon}</span>
          <span className="shrink-0 text-xs font-medium text-foreground">
            {item.toolName}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {summary}
          </span>
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              item.isError ? "bg-red-500" : "bg-green-500",
            )}
          />
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
            <Clock3 className="size-3" />
            {formatMessageTime(item.timestamp)}
          </span>
          {expanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}
        </button>

        {expanded && (
          <div className="border-t border-border p-3">
            <ToolContent item={item} />
          </div>
        )}
      </div>
    </section>
  );
}

function ToolContent({ item }: { item: TimelineToolItem }) {
  switch (item.toolName) {
    case "Read":
      return (
        <ToolRead
          input={item.input}
          output={item.output}
          filePath={item.filePath}
          fileContent={item.fileContent}
        />
      );
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
      if (SEARCH_TOOLS.has(item.toolName)) {
        return (
          <ToolSearch
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
}
