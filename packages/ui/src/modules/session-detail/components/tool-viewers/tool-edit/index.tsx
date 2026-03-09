"use client";

import { useMemo } from "react";
import {
  isImagePath,
  parseRichContent,
  tryBuildSvgPreview,
} from "../../shared/content-parser";
import { DiffViewer } from "../../viewers/diff-viewer";
import { ImageViewer } from "../../viewers/image-viewer";

interface ToolEditProps {
  input?: string;
  output?: string;
  filePath?: string;
  fileContent?: string;
}

export function ToolEdit({
  input,
  output,
  filePath,
  fileContent,
}: ToolEditProps) {
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
  const oldString =
    typeof parsed.old_string === "string" ? parsed.old_string : "";
  const newString =
    typeof parsed.new_string === "string" ? parsed.new_string : "";

  // Image file: try to render the image directly
  if (isImagePath(resolvedPath)) {
    // Try all available sources for SVG content (most complete first)
    const svgSrc = tryBuildSvgPreview(
      resolvedPath ?? "",
      fileContent,
      output,
      newString,
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

    // SVG is text-based — fall through to show the text diff (still useful)
    // Binary images (png/jpg/...) — show a simple message
    if (!resolvedPath?.toLowerCase().endsWith(".svg")) {
      return (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          Image file edited: {resolvedPath}
        </div>
      );
    }
    // SVG: fall through to diff below
  }

  if (!oldString && !newString) return null;

  return (
    <div className="space-y-2">
      <DiffViewer
        oldValue={oldString}
        newValue={newString}
        filePath={resolvedPath}
      />
      {output && (
        <div className="px-3 py-1 text-[11px] text-muted-foreground">
          {output.length > 200 ? `${output.slice(0, 200)}...` : output}
        </div>
      )}
    </div>
  );
}
