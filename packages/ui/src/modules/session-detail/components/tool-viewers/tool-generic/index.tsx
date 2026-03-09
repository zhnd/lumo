"use client";

import { useMemo } from "react";
import { parseRichContent } from "../../shared/content-parser";
import { ImageViewer } from "../../viewers/image-viewer";
import { MarkdownViewer } from "../../viewers/markdown-viewer";

interface ToolGenericProps {
  toolName: string;
  input?: string;
  output?: string;
}

export function ToolGeneric({
  toolName: _toolName,
  input,
  output,
}: ToolGenericProps) {
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
      {!parsedInput && input && (
        <div className="rounded-lg bg-muted/30 px-3 py-2">
          <pre className="whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
            {input.length > 500 ? `${input.slice(0, 500)}...` : input}
          </pre>
        </div>
      )}
      {parsedOutput.markdown.trim() && (
        <div className="max-h-[400px] overflow-auto rounded-lg bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
          <MarkdownViewer content={parsedOutput.markdown} />
        </div>
      )}
      {parsedOutput.images.length > 0 && (
        <ImageViewer images={parsedOutput.images} />
      )}
    </div>
  );
}
