"use client";

import { useMemo } from "react";
import {
  buildSvgPreviewSrc,
  isImagePath,
  parseRichContent,
  postProcessText,
} from "../../shared/content-parser";
import { CodeViewer } from "../../viewers/code-viewer";
import { ImageViewer } from "../../viewers/image-viewer";

interface ToolReadProps {
  input?: string;
  output?: string;
  filePath?: string;
  fileContent?: string;
}

export function ToolRead({
  input,
  output,
  filePath,
  fileContent,
}: ToolReadProps) {
  const parsed = useMemo(() => {
    try {
      return JSON.parse(input ?? "{}") as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [input]);

  const resolvedPath =
    filePath ??
    (typeof parsed.file_path === "string" ? parsed.file_path : undefined);
  const parsedOutput = parseRichContent(output);
  const parsedFileContent = parseRichContent(fileContent);

  const displayContent =
    parsedFileContent.markdown.trim() || parsedOutput.markdown.trim();
  const cleanContent = displayContent ? postProcessText(displayContent) : "";

  const svgSrc = buildSvgPreviewSrc(
    resolvedPath ?? "",
    fileContent ?? parsedFileContent.markdown,
  );

  const allImages = [...parsedOutput.images, ...parsedFileContent.images];

  // Image file: show image preview directly
  if (isImagePath(resolvedPath)) {
    const imageItems = svgSrc
      ? [{ src: svgSrc, alt: resolvedPath ?? "image" }]
      : allImages;

    if (imageItems.length > 0) {
      return <ImageViewer images={imageItems} />;
    }
    // Even for image paths, if we have no renderable image, fall through to code/text
  }

  if (!cleanContent && allImages.length === 0 && !svgSrc) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        No content returned
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {svgSrc && <ImageViewer images={[{ src: svgSrc, alt: "SVG preview" }]} />}
      {cleanContent && !svgSrc && (
        <CodeViewer
          code={cleanContent}
          filePath={resolvedPath}
          showHeader={!!resolvedPath}
        />
      )}
      {allImages.length > 0 && <ImageViewer images={allImages} />}
    </div>
  );
}
