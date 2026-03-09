"use client";

import { generateDiffFile } from "@git-diff-view/file";
import { type DiffFile, DiffModeEnum, DiffView } from "@git-diff-view/react";
import { getDiffViewHighlighter } from "@git-diff-view/shiki";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import "@git-diff-view/react/styles/diff-view.css";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { inferLang } from "../../shared/language-map";

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  filePath?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

const COLLAPSED_MAX_HEIGHT = 160;

export function DiffViewer({
  oldValue,
  newValue,
  filePath,
  collapsible = false,
  defaultCollapsed = true,
  className,
}: DiffViewerProps) {
  const [highlighter, setHighlighter] = useState<
    Awaited<ReturnType<typeof getDiffViewHighlighter>> | undefined
  >(undefined);
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  const fileName = filePath?.split("/").pop() ?? "file";
  const lang = inferLang(filePath);

  useEffect(() => {
    if (!highlighter) {
      getDiffViewHighlighter().then(setHighlighter);
    }
  }, [highlighter]);

  const diffFile = useMemo<DiffFile | undefined>(() => {
    const file = generateDiffFile(
      fileName,
      oldValue,
      fileName,
      newValue,
      lang,
      lang,
    );
    file.initTheme("light");
    file.initRaw();
    if (highlighter) {
      file.initSyntax({ registerHighlighter: highlighter });
    }
    file.buildUnifiedDiffLines();
    file.onAllCollapse("unified");
    return file;
  }, [oldValue, newValue, fileName, lang, highlighter]);

  if (!diffFile) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border text-[11px]",
        className,
      )}
    >
      <div
        className="overflow-x-auto"
        style={
          collapsible && !expanded
            ? { maxHeight: COLLAPSED_MAX_HEIGHT, overflow: "hidden" }
            : undefined
        }
      >
        <DiffView
          diffFile={diffFile}
          diffViewMode={DiffModeEnum.Unified}
          diffViewTheme="light"
          diffViewFontSize={11}
          diffViewWrap
        />
      </div>
      {collapsible && (
        <div className="flex justify-center border-t bg-muted/30 py-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="size-2.5" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="size-2.5" />
                Expand all
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
