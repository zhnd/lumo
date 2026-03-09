"use client";

import { FileSearch, Globe, Search } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { parseRichContent } from "../../shared/content-parser";
import { MarkdownViewer } from "../../viewers/markdown-viewer";

interface ToolSearchProps {
  toolName: string;
  input?: string;
  output?: string;
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
  Grep: <FileSearch className="size-3.5" />,
  Glob: <FileSearch className="size-3.5" />,
  WebSearch: <Globe className="size-3.5" />,
  WebFetch: <Globe className="size-3.5" />,
};

export function ToolSearch({ toolName, input, output }: ToolSearchProps) {
  const parsed = useMemo(() => {
    try {
      return JSON.parse(input ?? "{}") as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [input]);

  const parsedOutput = parseRichContent(output);
  const query =
    typeof parsed.pattern === "string"
      ? parsed.pattern
      : typeof parsed.query === "string"
        ? parsed.query
        : typeof parsed.url === "string"
          ? parsed.url
          : null;

  const icon = TOOL_ICONS[toolName] ?? <Search className="size-3.5" />;

  return (
    <div className="space-y-2">
      {query && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">{icon}</span>
          <code className="font-mono text-[11px]">{query}</code>
        </div>
      )}
      {parsedOutput.markdown.trim() && (
        <div
          className={cn(
            "max-h-[400px] overflow-auto rounded-lg bg-muted/20 px-3 py-2",
            "text-[11px] text-muted-foreground",
          )}
        >
          <MarkdownViewer content={parsedOutput.markdown} />
        </div>
      )}
      {!parsedOutput.markdown.trim() && !query && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          No results
        </div>
      )}
    </div>
  );
}
