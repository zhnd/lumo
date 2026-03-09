"use client";

import { Check, Copy, FileCode } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { inferLang } from "../../shared/language-map";
import { MarkdownViewer } from "../markdown-viewer";

const MAX_VISIBLE_LINES = 50;

interface CodeViewerProps {
  code: string;
  filePath?: string;
  language?: string;
  showHeader?: boolean;
  className?: string;
}

export function CodeViewer({
  code,
  filePath,
  language,
  showHeader = true,
  className,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const lang = language ?? inferLang(filePath);
  const fileName = filePath?.split("/").pop();
  const lines = code.split("\n");
  const isLong = lines.length > MAX_VISIBLE_LINES;
  const displayCode =
    isLong && !showAll ? lines.slice(0, MAX_VISIBLE_LINES).join("\n") : code;
  const fenced = `\`\`\`${lang}\n${displayCode}\n\`\`\``;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border",
        className,
      )}
    >
      {showHeader && (
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <FileCode className="size-3.5 shrink-0 text-muted-foreground" />
            {fileName && (
              <span className="truncate text-xs font-medium">{fileName}</span>
            )}
            <Badge
              variant="outline"
              className="h-4 shrink-0 rounded px-1.5 text-[10px]"
            >
              {lang}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="size-3" />
            ) : (
              <Copy className="size-3" />
            )}
          </Button>
        </div>
      )}
      <div className="max-h-[400px] overflow-auto text-[11px]">
        <MarkdownViewer content={fenced} />
      </div>
      {isLong && (
        <div className="flex justify-center border-t border-border bg-muted/30 py-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-[10px] text-muted-foreground"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show less" : `Show all ${lines.length} lines`}
          </Button>
        </div>
      )}
    </div>
  );
}
