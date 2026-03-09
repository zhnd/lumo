"use client";

import { useMemo } from "react";
import {
  isImagePath,
  parseRichContent,
  tryBuildSvgPreview,
} from "../../shared/content-parser";
import { CodeViewer } from "../../viewers/code-viewer";
import { DiffViewer } from "../../viewers/diff-viewer";
import { ImageViewer } from "../../viewers/image-viewer";

interface ToolWriteProps {
  input?: string;
  output?: string;
  toolName?: string;
  filePath?: string;
  fileContent?: string;
}

export function ToolWrite({
  input,
  output,
  toolName,
  filePath,
  fileContent,
}: ToolWriteProps) {
  const parsed = useMemo(() => {
    try {
      return JSON.parse(input ?? "{}") as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [input]);

  if (!parsed) return null;

  const inputFilePath =
    typeof parsed.file_path === "string" ? parsed.file_path : undefined;
  const resolvedPath = filePath ?? inputFilePath;
  const content =
    typeof parsed.content === "string" ? parsed.content : undefined;
  const newSource =
    typeof parsed.new_source === "string" ? parsed.new_source : undefined;

  const writeContent = content ?? newSource;

  if (!writeContent) return null;

  // Image file: always show image, never diff/code
  if (isImagePath(resolvedPath)) {
    const svgSrc = tryBuildSvgPreview(
      resolvedPath ?? "",
      fileContent,
      writeContent,
      output,
    );

    if (svgSrc) {
      return (
        <ImageViewer images={[{ src: svgSrc, alt: resolvedPath ?? "image" }]} />
      );
    }

    const parsedOutput = parseRichContent(output);
    const parsedFileContent = parseRichContent(fileContent);
    const allImages = [...parsedOutput.images, ...parsedFileContent.images];
    if (allImages.length > 0) {
      return <ImageViewer images={allImages} />;
    }

    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        Image file created: {resolvedPath}
      </div>
    );
  }

  if (toolName === "NotebookEdit") {
    return (
      <div className="space-y-2">
        <CodeViewer
          code={writeContent}
          filePath={resolvedPath ?? "notebook-cell"}
          showHeader={!!resolvedPath}
        />
        {output && (
          <div className="px-3 py-1 text-[11px] text-muted-foreground">
            {output.length > 200 ? `${output.slice(0, 200)}...` : output}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <DiffViewer
        oldValue=""
        newValue={writeContent}
        filePath={resolvedPath}
        collapsible
        defaultCollapsed
      />
      {output && (
        <div className="px-3 py-1 text-[11px] text-muted-foreground">
          {output.length > 200 ? `${output.slice(0, 200)}...` : output}
        </div>
      )}
    </div>
  );
}
