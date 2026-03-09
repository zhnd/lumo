import { languageFromPath } from "./language-map";
import { renderXmlLikeMetaTags } from "./text-utils";

export interface RichContent {
  markdown: string;
  images: ImageData[];
}

export interface ImageData {
  src: string;
  alt: string;
}

export function parseRichContent(raw?: string): RichContent {
  const text = normalizeText((raw ?? "").trim());
  if (!text) return { markdown: "", images: [] };

  try {
    const parsed = JSON.parse(text) as unknown;
    return extractRichContent(parsed);
  } catch {
    return { markdown: postProcessText(text), images: [] };
  }
}

function extractRichContent(value: unknown): RichContent {
  if (typeof value === "string") {
    return { markdown: postProcessText(value), images: [] };
  }

  if (Array.isArray(value)) {
    const parts = value.map(extractRichContent);
    return {
      markdown: parts
        .map((p) => p.markdown)
        .filter(Boolean)
        .join("\n\n"),
      images: parts.flatMap((p) => p.images),
    };
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const asImage = extractImageFromObject(obj);
    if (asImage) {
      return { markdown: "", images: [asImage] };
    }

    if (
      typeof obj.type === "string" &&
      obj.type === "text" &&
      typeof obj.text === "string"
    ) {
      return { markdown: postProcessText(obj.text), images: [] };
    }

    if (obj.file && typeof obj.file === "object" && obj.file !== null) {
      const file = obj.file as Record<string, unknown>;
      if (typeof file.content === "string" && file.content.trim()) {
        return { markdown: postProcessText(file.content), images: [] };
      }
    }

    if (obj.content != null) {
      const contentPart = extractRichContent(obj.content);
      const messagePart =
        typeof obj.message === "string" && obj.message.trim()
          ? {
              markdown: postProcessText(obj.message),
              images: [] as ImageData[],
            }
          : null;
      return {
        markdown: [contentPart.markdown, messagePart?.markdown ?? ""]
          .filter(Boolean)
          .join("\n\n"),
        images: [...contentPart.images, ...(messagePart?.images ?? [])],
      };
    }

    if (typeof obj.output === "string") {
      return { markdown: postProcessText(obj.output), images: [] };
    }

    if (typeof obj.message === "string") {
      return { markdown: postProcessText(obj.message), images: [] };
    }

    return {
      markdown: `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``,
      images: [],
    };
  }

  return { markdown: String(value ?? ""), images: [] };
}

export function extractImageFromObject(
  obj: Record<string, unknown>,
): ImageData | null {
  const type = typeof obj.type === "string" ? obj.type.toLowerCase() : "";
  const source =
    obj.source && typeof obj.source === "object"
      ? (obj.source as Record<string, unknown>)
      : null;
  const alt = typeof obj.alt === "string" ? obj.alt : "image";

  if (type === "image" && source) {
    if (
      source.type === "base64" &&
      typeof source.data === "string" &&
      typeof source.media_type === "string"
    ) {
      return {
        src: `data:${source.media_type};base64,${source.data}`,
        alt,
      };
    }
    if (typeof source.url === "string") {
      return { src: source.url, alt };
    }
  }

  if (typeof obj.url === "string" && isLikelyImageUrl(obj.url)) {
    return { src: obj.url, alt };
  }

  return null;
}

function isLikelyImageUrl(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    lower.startsWith("data:image/") ||
    /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/.test(lower)
  );
}

function normalizeText(text: string): string {
  return renderXmlLikeMetaTags(text).trim();
}

export function postProcessText(text: string): string {
  const cleaned = normalizeText(text);
  if (!cleaned) return "";

  const lines = cleaned.split("\n");
  const arrowLineRe = /^\s*\d+\u2192/;
  const arrowLineCount = lines.filter((line) => arrowLineRe.test(line)).length;

  if (lines.length > 0 && arrowLineCount / lines.length >= 0.6) {
    return lines
      .map((line) => line.replace(/^\s*\d+\u2192\s?/, ""))
      .join("\n")
      .trim();
  }

  return cleaned;
}

export function buildSvgPreviewSrc(
  filePath: string,
  content: string,
): string | null {
  const looksLikeSvgPath = filePath.toLowerCase().endsWith(".svg");
  const trimmed = content.trim();
  const looksLikeSvgContent =
    /^<svg[\s>]/i.test(trimmed) || /^<\?xml[\s\S]*?<svg[\s>]/i.test(trimmed);

  if (!looksLikeSvgPath && !looksLikeSvgContent) {
    return null;
  }

  const svgSource = extractSvgContent(trimmed);
  if (!svgSource) return null;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgSource)}`;
}

function extractSvgContent(text: string): string | null {
  if (!text) return null;
  const directMatch = text.match(/<svg[\s\S]*<\/svg>/i);
  if (directMatch?.[0]) return directMatch[0];
  if (/^<svg[\s>]/i.test(text)) return text;
  return null;
}

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "ico",
  "bmp",
  "tiff",
  "avif",
]);

export function isImagePath(filePath?: string): boolean {
  if (!filePath) return false;
  const ext = filePath.split(".").pop()?.toLowerCase();
  return !!ext && IMAGE_EXTENSIONS.has(ext);
}

/**
 * Try to build an SVG preview from multiple candidate sources.
 * Tries each source in order, returns the first successful data URI.
 */
export function tryBuildSvgPreview(
  filePath: string,
  ...sources: (string | undefined | null)[]
): string | null {
  for (const src of sources) {
    if (!src) continue;
    const result = buildSvgPreviewSrc(filePath, src);
    if (result) return result;
  }
  return null;
}

export function buildImagePreviewSrc(
  filePath: string,
  content: string,
): string | null {
  // SVG: render from text content
  const svgSrc = buildSvgPreviewSrc(filePath, content);
  if (svgSrc) return svgSrc;

  // Binary images won't have usable text content, so no preview possible
  // from the content string alone. Images extracted from JSON (base64)
  // are handled by parseRichContent → ImageViewer.
  return null;
}

export function formatFileContentForRender(
  content: string,
  filePath: string,
): string {
  const trimmed = content.trim();
  if (!trimmed) return content;
  if (trimmed.startsWith("```")) return content;

  const lang = languageFromPath(filePath);
  if (!lang || lang === "markdown") return content;

  return `\`\`\`${lang}\n${content}\n\`\`\``;
}
