"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { parseRichContent } from "../../shared/content-parser";
import { MarkdownViewer } from "../../viewers/markdown-viewer";

interface ToolMcpProps {
  toolName: string;
  input?: string;
  output?: string;
}

/** Parse "mcp__serverName__toolName" into parts. */
function parseMcpToolName(name: string): {
  server: string;
  tool: string;
} | null {
  const parts = name.split("__");
  if (parts.length >= 3 && parts[0] === "mcp") {
    return { server: parts[1], tool: parts.slice(2).join("__") };
  }
  return null;
}

export function ToolMcp({ toolName, input, output }: ToolMcpProps) {
  const mcpParts = parseMcpToolName(toolName);
  const parsedInput = useMemo(() => {
    if (!input) return null;
    try {
      return JSON.parse(input) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [input]);

  const parsedOutput = parseRichContent(output);

  return (
    <div className="space-y-2">
      {mcpParts && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full px-2 text-[10px]">
            {mcpParts.server}
          </Badge>
          <span className="text-xs font-medium text-foreground">
            {mcpParts.tool}
          </span>
        </div>
      )}

      {parsedInput && (
        <div className="space-y-1 rounded-lg bg-muted/30 px-3 py-2">
          {Object.entries(parsedInput).map(([key, value]) => (
            <div key={key} className="flex gap-2 text-[11px]">
              <span className="shrink-0 font-medium text-muted-foreground">
                {key}:
              </span>
              <span className="min-w-0 break-all text-foreground">
                {typeof value === "string"
                  ? value.length > 200
                    ? `${value.slice(0, 200)}...`
                    : value
                  : JSON.stringify(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {parsedOutput.markdown.trim() && (
        <div className="max-h-[400px] overflow-auto rounded-lg bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
          <MarkdownViewer content={parsedOutput.markdown} />
        </div>
      )}
    </div>
  );
}
