"use client";

import { cn } from "@/lib/utils";

interface TerminalViewerProps {
  command?: string;
  output?: string;
  isError?: boolean;
  className?: string;
}

export function TerminalViewer({
  command,
  output,
  isError,
  className,
}: TerminalViewerProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-zinc-950 dark:bg-zinc-950",
        className,
      )}
    >
      {command && (
        <div className="border-b border-zinc-800 px-3 py-2">
          <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-zinc-300">
            <span className="select-none text-green-400">$ </span>
            {command}
          </pre>
        </div>
      )}
      {output && (
        <div className="max-h-[400px] overflow-auto px-3 py-2">
          <pre
            className={cn(
              "whitespace-pre-wrap break-words font-mono text-[11px]",
              isError ? "text-red-400" : "text-zinc-400",
            )}
          >
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
