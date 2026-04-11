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
        "overflow-hidden rounded-xl bg-muted/20 px-4 py-3",
        className,
      )}
    >
      {command && (
        <pre className="whitespace-pre-wrap break-all font-mono text-xs text-foreground">
          <span className="select-none text-primary/60">$ </span>
          {command}
        </pre>
      )}
      {output && (
        <div className={cn("max-h-[400px] overflow-auto", command && "mt-2")}>
          <pre
            className={cn(
              "whitespace-pre-wrap break-words font-mono text-xs",
              isError ? "text-destructive/80" : "text-muted-foreground",
            )}
          >
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
