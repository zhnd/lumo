"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DiffView, DiffModeEnum, type DiffFile } from "@git-diff-view/react";
import { generateDiffFile } from "@git-diff-view/file";
import { getDiffViewHighlighter } from "@git-diff-view/shiki";
import "@git-diff-view/react/styles/diff-view.css";
import { Button } from "@/components/ui/button";
import { inferLang } from "./libs";

interface ToolResultDiffProps {
  toolName: string;
  input: string;
}

interface EditInput {
  file_path?: string;
  old_string?: string;
  new_string?: string;
}

interface WriteInput {
  file_path?: string;
  content?: string;
}

const COLLAPSED_MAX_HEIGHT = 160;

export function ToolResultDiff({ toolName, input }: ToolResultDiffProps) {
  const [highlighter, setHighlighter] = useState<
    Awaited<ReturnType<typeof getDiffViewHighlighter>> | undefined
  >(undefined);
  const [expanded, setExpanded] = useState(false);
  const isWrite = toolName === "Write";

  const parsed = useMemo<EditInput | WriteInput | null>(() => {
    try {
      return JSON.parse(input) as EditInput | WriteInput;
    } catch {
      return null;
    }
  }, [input]);

  const { oldValue, newValue } = useMemo(() => {
    if (!parsed) return { oldValue: null, newValue: null };
    return getDiffValues(parsed, toolName);
  }, [parsed, toolName]);

  const filePath = parsed?.file_path;
  const fileName = filePath?.split("/").pop() ?? "file";
  const lang = inferLang(filePath);

  useEffect(() => {
    if (!highlighter) {
      getDiffViewHighlighter().then(setHighlighter);
    }
  }, [highlighter]);

  const diffFile = useMemo<DiffFile | undefined>(() => {
    if (oldValue === null && newValue === null) return undefined;
    const file = generateDiffFile(
      fileName,
      oldValue ?? "",
      fileName,
      newValue ?? "",
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

  if (!parsed) return null;
  if (oldValue === null && newValue === null) return null;
  if (!diffFile) return null;

  return (
    <div className="overflow-hidden border-t text-[11px]">
      <div
        className="overflow-x-auto"
        style={
          isWrite && !expanded
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
      {isWrite && (
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

function getDiffValues(
  parsed: EditInput | WriteInput,
  toolName: string,
): { oldValue: string | null; newValue: string | null } {
  if (toolName === "Edit") {
    const editInput = parsed as EditInput;
    if (editInput.old_string != null || editInput.new_string != null) {
      return {
        oldValue: editInput.old_string ?? "",
        newValue: editInput.new_string ?? "",
      };
    }
  }

  if (toolName === "Write") {
    const writeInput = parsed as WriteInput;
    if (writeInput.content != null) {
      return { oldValue: "", newValue: writeInput.content };
    }
  }

  return { oldValue: null, newValue: null };
}
