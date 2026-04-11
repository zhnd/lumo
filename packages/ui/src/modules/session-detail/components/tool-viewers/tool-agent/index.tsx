"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { parseRichContent } from "../../shared/content-parser";
import { MarkdownViewer } from "../../viewers/markdown-viewer";

interface ToolAgentProps {
  input?: string;
  output?: string;
}

export function ToolAgent({ input, output }: ToolAgentProps) {
  const [promptExpanded, setPromptExpanded] = useState(false);

  const parsed = useMemo(() => {
    try {
      return JSON.parse(input ?? "{}") as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [input]);

  const description =
    typeof parsed.description === "string" ? parsed.description : undefined;
  const subagentType =
    typeof parsed.subagent_type === "string" ? parsed.subagent_type : undefined;
  const prompt = typeof parsed.prompt === "string" ? parsed.prompt : undefined;

  const parsedOutput = parseRichContent(output);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {subagentType && (
          <Badge
            variant="outline"
            className="rounded-full px-2 text-[10px] capitalize"
          >
            {subagentType}
          </Badge>
        )}
        {description && (
          <span className="text-xs font-medium text-foreground">
            {description}
          </span>
        )}
      </div>

      {prompt && (
        <div>
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => setPromptExpanded(!promptExpanded)}
          >
            {promptExpanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            Prompt
          </button>
          {promptExpanded && (
            <div className="mt-1 max-h-[300px] overflow-auto rounded-lg bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              <pre className="whitespace-pre-wrap break-words">{prompt}</pre>
            </div>
          )}
        </div>
      )}

      {parsedOutput.markdown.trim() && (
        <div className="max-h-[400px] overflow-auto rounded-lg bg-muted/20 px-3 py-2 text-sm">
          <MarkdownViewer content={parsedOutput.markdown} />
        </div>
      )}
    </div>
  );
}
