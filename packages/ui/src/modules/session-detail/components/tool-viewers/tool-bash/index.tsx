"use client";

import { useMemo } from "react";
import { parseRichContent } from "../../shared/content-parser";
import { TerminalViewer } from "../../viewers/terminal-viewer";

interface ToolBashProps {
  input?: string;
  output?: string;
  isError?: boolean;
}

export function ToolBash({ input, output, isError }: ToolBashProps) {
  const parsed = useMemo(() => {
    try {
      return JSON.parse(input ?? "{}") as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [input]);

  const command =
    typeof parsed.command === "string" ? parsed.command : undefined;
  const parsedOutput = parseRichContent(output);
  const displayOutput = parsedOutput.markdown.trim() || undefined;

  return (
    <TerminalViewer
      command={command}
      output={displayOutput}
      isError={isError}
    />
  );
}
