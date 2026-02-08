"use client";

import { memo, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  Wrench,
  Brain,
  CheckCircle2,
  AlertCircle,
  FileText,
  Braces,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { ClaudeContentBlock, ClaudeToolUse } from "@/src/generated/typeshare-types";
import type { MessageItemProps } from "./types";
import { markdownComponents } from "./markdown-components";
import {
  sanitizeMessageText,
  extractSlashCommand,
  extractStandaloneStdout,
  renderXmlLikeMetaTags,
} from "./libs";
import { ToolUses } from "./tool-uses";

const COLLAPSE_THRESHOLD = 1500;
const RESULT_PREVIEW_LIMIT = 900;
const SECTION_PREVIEW_HEIGHT_CLASS = "max-h-56";

export const MessageItem = memo(function MessageItem({
  message,
}: MessageItemProps) {
  const isUser = message.type === "user";
  const isSystem = message.type === "system";

  const fallbackBlocks: ClaudeContentBlock[] = [];
  if (message.text) {
    fallbackBlocks.push({ type: "text", text: message.text });
  }
  if (message.toolUses) {
    for (const t of message.toolUses) {
      fallbackBlocks.push({
        type: "tool_use",
        toolUseId: t.id,
        name: t.name,
        input: t.input,
      });
    }
  }
  const blocks = message.blocks && message.blocks.length > 0 ? message.blocks : fallbackBlocks;
  const renderableBlocks = blocks.filter(isRenderableBlock);
  if (renderableBlocks.length === 0) {
    return null;
  }
  const hasToolResult = renderableBlocks.some((b) => b.type === "tool_result");
  const hasText = renderableBlocks.some((b) => b.type === "text");
  const shouldUseUserBubble = isUser && !isSystem && hasText && !hasToolResult;
  const messageKindLabel = getMessageKindLabel({
    isSystem,
    renderableBlocks,
  });

  return (
    <div className={cn("px-4 py-3 md:px-6", shouldUseUserBubble ? "flex justify-end" : "flex")}>
      <div
        className={cn(
          "w-full max-w-[86%] rounded-xl border p-3",
          shouldUseUserBubble && "rounded-tr-sm border-transparent bg-accent",
          !shouldUseUserBubble && "bg-card",
          isSystem && "border-dashed bg-muted/30",
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {message.model && !isUser && (
              <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px]">
                {message.model}
              </Badge>
            )}
            {messageKindLabel && (
              <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
                {messageKindLabel}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Clock3 className="size-3" />
            <span>{formatMessageTime(message.timestamp)}</span>
          </div>
        </div>

        <div className="space-y-2">
          {renderableBlocks.map((block, index) => (
            <ContentBlockItem key={`${message.uuid}-${index}-${block.type}`} block={block} />
          ))}
        </div>
      </div>
    </div>
  );
});

function ContentBlockItem({ block }: { block: ClaudeContentBlock }) {
  if (block.type === "text" && block.text) {
    return <TextBlock text={block.text} />;
  }

  if (block.type === "tool_use" && block.name) {
    const tool: ClaudeToolUse = {
      id: block.toolUseId ?? `tool-${block.name}`,
      name: block.name,
      input: block.input,
    };
    return (
      <div className="rounded-lg border bg-muted/20 p-2">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Wrench className="size-3.5" />
          <span>Tool Call</span>
        </div>
        <ToolUses toolUses={[tool]} />
      </div>
    );
  }

  if (block.type === "tool_result") {
    return <ToolResultBlock block={block} />;
  }

  if (block.type === "thinking" || block.type === "redacted_thinking") {
    return <ThinkingBlock block={block} />;
  }

  return null;
}

function TextBlock({ text }: { text: string }) {
  const parsed = useMemo(() => {
    const cmd = extractSlashCommand(text);
    if (cmd) return { type: "command" as const, command: cmd };

    const stdout = extractStandaloneStdout(text);
    if (stdout) return { type: "stdout" as const, stdout };

    const sanitized = sanitizeMessageText(text);
    return { type: "text" as const, text: sanitized };
  }, [text]);

  const isLong = parsed.type === "text" && parsed.text.length > COLLAPSE_THRESHOLD;

  if (parsed.type === "command") {
    return (
      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
        <code className="font-semibold">
          {parsed.command.name}
          {parsed.command.args ? ` ${parsed.command.args}` : ""}
        </code>
        {parsed.command.stdout && (
          <div className="mt-1 whitespace-pre-wrap break-all text-muted-foreground">
            {parsed.command.stdout}
          </div>
        )}
      </div>
    );
  }

  if (parsed.type === "stdout") {
    return (
      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
        <code className="whitespace-pre-wrap break-all text-muted-foreground">
          {parsed.stdout}
        </code>
      </div>
    );
  }

  return (
    <ExpandableSection title="Message" collapsible={isLong} defaultExpanded={!isLong}>
      {isLong ? (
        <ScrollArea className="h-[220px]">
          <MarkdownBody text={parsed.text} />
        </ScrollArea>
      ) : (
        <MarkdownBody text={parsed.text} />
      )}
    </ExpandableSection>
  );
}

function MarkdownBody({ text }: { text: string }) {
  return (
    <div className="text-sm leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function ToolResultBlock({ block }: { block: ClaudeContentBlock }) {
  const parsedOutput = parseToolResultOutput(block.output);
  const output = parsedOutput.markdown;
  const outputImages = parsedOutput.images;
  const filePath = block.filePath?.trim() ?? "";
  const parsedFileContent = parseToolResultOutput(block.fileContent);
  const fileContent = parsedFileContent.markdown;
  const fileContentForRender = formatFileContentForRender(fileContent, filePath);
  const fileImages = parsedFileContent.images;
  const svgPreviewSrc = buildSvgPreviewSrc(filePath, block.fileContent ?? fileContent);
  const hasMediaPreview =
    outputImages.length > 0 ||
    fileImages.length > 0 ||
    !!svgPreviewSrc ||
    isMediaFilePath(filePath);
  const hasFileContent = !!fileContent;
  const rawPayload = formatRawPayloadForDisplay(block.rawJson);
  const showRawPayload = !!rawPayload;
  const isUpdateSuccess = /^The file\s+.+\s+has been (updated|overwritten) successfully\.$/i.test(
    output.trim(),
  );
  const shouldAutoShowFile = hasFileContent && isUpdateSuccess;
  const shouldAutoShowMedia = hasMediaPreview;
  const isLong = output.length > RESULT_PREVIEW_LIMIT;
  const [contentCopyState, setContentCopyState] = useState<"idle" | "success" | "error">("idle");
  const [pathCopyState, setPathCopyState] = useState<"idle" | "success" | "error">("idle");

  const handleCopyContent = async () => {
    const content = fileContent || output;
    if (!content) return;
    const ok = await copyText(content);
    setContentCopyState(ok ? "success" : "error");
    window.setTimeout(() => setContentCopyState("idle"), 1400);
  };

  const handleCopyPath = async () => {
    if (!filePath) return;
    const ok = await copyText(filePath);
    setPathCopyState(ok ? "success" : "error");
    window.setTimeout(() => setPathCopyState("idle"), 1400);
  };

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-xs",
        block.isError ? "border-red-300/60 bg-red-50/40" : "bg-muted/30",
      )}
    >
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        {block.isError ? (
          <AlertCircle className="size-3.5 text-red-500" />
        ) : (
          <CheckCircle2 className="size-3.5 text-emerald-500" />
        )}
        <span>Tool Result</span>
        {block.toolUseId && (
          <Badge variant="outline" className="ml-1 font-mono text-[10px]">
            {block.toolUseId.slice(0, 8)}
          </Badge>
        )}
        {filePath && (
          <Badge
            variant="secondary"
            className="ml-auto h-5 min-w-0 max-w-[min(60%,420px)] px-2 text-[10px]"
            title={filePath}
          >
            <span className="block truncate">{filePath}</span>
          </Badge>
        )}
      </div>
      <div className="mb-2 flex justify-end gap-1">
        {(output || fileContent) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
            onClick={handleCopyContent}
          >
            <Copy className="size-3" />
            {contentCopyState === "idle" && "Copy content"}
            {contentCopyState === "success" && "Copied"}
            {contentCopyState === "error" && "Copy failed"}
          </Button>
        )}
        {filePath && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
            onClick={handleCopyPath}
          >
            <Copy className="size-3" />
            {pathCopyState === "idle" && "Copy path"}
            {pathCopyState === "success" && "Copied"}
            {pathCopyState === "error" && "Copy failed"}
          </Button>
        )}
      </div>

      {(output || outputImages.length > 0) ? (
        <ExpandableSection
          title="Result"
          collapsible={isLong}
          defaultExpanded={shouldAutoShowMedia || !isLong}
          contentClassName="text-[11px] leading-relaxed break-words text-muted-foreground"
        >
          {output && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={markdownComponents}
            >
              {output}
            </ReactMarkdown>
          )}
          {outputImages.length > 0 && <ToolResultImages images={outputImages} />}
        </ExpandableSection>
      ) : (
        <span className="text-muted-foreground">No output</span>
      )}

      {hasFileContent && (
        <div className="mt-2 rounded-md border border-border/60 bg-background/80 px-2 py-1.5">
          <ExpandableSection
            title="File content"
            icon={<FileText className="size-3.5" />}
            collapsible
            defaultExpanded={shouldAutoShowMedia || shouldAutoShowFile}
            collapsedClassName={SECTION_PREVIEW_HEIGHT_CLASS}
            contentClassName="text-[11px] leading-relaxed break-words text-muted-foreground"
          >
            <>
              {filePath && (
                <div className="mb-2 text-[10px] text-muted-foreground">
                  <span className="font-medium">Path:</span> <code>{filePath}</code>
                </div>
              )}
              {svgPreviewSrc && (
                <div className="mb-3 overflow-hidden rounded-md border bg-background p-2">
                  <ImageWithFallback
                    src={svgPreviewSrc}
                    alt="svg-preview"
                    className="max-h-[360px]"
                  />
                </div>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={markdownComponents}
              >
                {fileContentForRender}
              </ReactMarkdown>
              {fileImages.length > 0 && <ToolResultImages images={fileImages} />}
            </>
          </ExpandableSection>
        </div>
      )}

      {showRawPayload && (
        <div className="mt-2 rounded-md border border-border/60 bg-background/80 px-2 py-1.5">
          <ExpandableSection
            title="Raw payload"
            icon={<Braces className="size-3.5" />}
            collapsible
            defaultExpanded={false}
            collapsedClassName={SECTION_PREVIEW_HEIGHT_CLASS}
            contentClassName="text-[11px] leading-relaxed break-words text-muted-foreground"
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={markdownComponents}
            >
              {rawPayload}
            </ReactMarkdown>
          </ExpandableSection>
        </div>
      )}
    </div>
  );
}

function ExpandableSection({
  title,
  icon,
  collapsible,
  defaultExpanded,
  children,
  contentClassName,
  collapsedClassName = "max-h-48",
}: {
  title: string;
  icon?: ReactNode;
  collapsible: boolean;
  defaultExpanded: boolean;
  children: ReactNode;
  contentClassName?: string;
  collapsedClassName?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const showToggle = collapsible;

  return (
    <div>
      {showToggle && (
        <button
          type="button"
          className="mb-1 flex w-full items-center justify-between gap-2 rounded-sm text-left text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="inline-flex min-w-0 items-center gap-1.5">
            {icon}
            <span className="truncate">{title}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span>{expanded ? "Hide" : "View"}</span>
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </span>
        </button>
      )}

      {(!showToggle || expanded || !collapsible) && (
        <div className={cn(contentClassName, !expanded && collapsible && "overflow-hidden", !expanded && collapsible && collapsedClassName)}>
          {children}
        </div>
      )}

      {showToggle && expanded && (
        <div className="mt-1 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs text-muted-foreground"
            onClick={() => setExpanded(false)}
          >
            <ChevronUp className="size-3" />
            Collapse
          </Button>
        </div>
      )}
    </div>
  );
}

function ThinkingBlock({ block }: { block: ClaudeContentBlock }) {
  const text = block.text?.trim() ?? "";

  if (!text) {
    return null;
  }

  return (
    <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs">
      <ExpandableSection
        title={block.type === "redacted_thinking" ? "Redacted thinking" : "Thinking"}
        icon={<Brain className="size-3.5" />}
        collapsible
        defaultExpanded={false}
        collapsedClassName={SECTION_PREVIEW_HEIGHT_CLASS}
        contentClassName="text-[11px] text-muted-foreground"
      >
        <pre className="whitespace-pre-wrap break-words">{text}</pre>
      </ExpandableSection>
    </div>
  );
}

function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isRenderableBlock(block: ClaudeContentBlock): boolean {
  if (block.type === "text" || block.type === "thinking" || block.type === "redacted_thinking") {
    return !!block.text?.trim();
  }
  if (block.type === "tool_use") {
    return !!block.name?.trim();
  }
  if (block.type === "tool_result") {
    return !!block.output?.trim() || !!block.fileContent?.trim() || !!block.rawJson?.trim();
  }
  return false;
}

function getMessageKindLabel({
  isSystem,
  renderableBlocks,
}: {
  isSystem: boolean;
  renderableBlocks: ClaudeContentBlock[];
}): string | null {
  if (isSystem) return "System";
  const allToolResult = renderableBlocks.every((block) => block.type === "tool_result");
  if (allToolResult) return "Tool Result";
  const allToolUse = renderableBlocks.every((block) => block.type === "tool_use");
  if (allToolUse) return "Tool Call";
  return null;
}

function normalizeToolResultOutput(raw?: string): string {
  return parseToolResultOutput(raw).markdown;
}

interface ParsedToolResultOutput {
  markdown: string;
  images: ToolResultImage[];
}

interface ToolResultImage {
  src: string;
  alt: string;
}

function parseToolResultOutput(raw?: string): ParsedToolResultOutput {
  const text = normalizeXmlLikeTags((raw ?? "").trim());
  if (!text) return { markdown: "", images: [] };

  try {
    const parsed = JSON.parse(text) as unknown;
    return extractToolResultOutput(parsed);
  } catch {
    return {
      markdown: postProcessToolResultText(text),
      images: [],
    };
  }
}

function extractToolResultOutput(value: unknown): ParsedToolResultOutput {
  if (typeof value === "string") {
    return { markdown: postProcessToolResultText(value), images: [] };
  }

  if (Array.isArray(value)) {
    const parts = value.map(extractToolResultOutput);
    return {
      markdown: parts.map((p) => p.markdown).filter(Boolean).join("\n\n"),
      images: parts.flatMap((p) => p.images),
    };
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const asImage = extractImageFromObject(obj);
    if (asImage) {
      return { markdown: "", images: [asImage] };
    }

    if (typeof obj.type === "string" && obj.type === "text" && typeof obj.text === "string") {
      return { markdown: postProcessToolResultText(obj.text), images: [] };
    }

    if (obj.file && typeof obj.file === "object" && obj.file !== null) {
      const file = obj.file as Record<string, unknown>;
      if (typeof file.content === "string" && file.content.trim()) {
        return { markdown: postProcessToolResultText(file.content), images: [] };
      }
    }

    if (obj.content != null) {
      const contentPart = extractToolResultOutput(obj.content);
      const messagePart =
        typeof obj.message === "string" && obj.message.trim()
          ? { markdown: postProcessToolResultText(obj.message), images: [] as ToolResultImage[] }
          : null;
      return {
        markdown: [contentPart.markdown, messagePart?.markdown ?? ""].filter(Boolean).join("\n\n"),
        images: [...contentPart.images, ...(messagePart?.images ?? [])],
      };
    }

    if (typeof obj.output === "string") {
      return { markdown: postProcessToolResultText(obj.output), images: [] };
    }

    if (typeof obj.message === "string") {
      return { markdown: postProcessToolResultText(obj.message), images: [] };
    }

    return {
      markdown: JSON.stringify(value, null, 2),
      images: [],
    };
  }

  return {
    markdown: String(value ?? ""),
    images: [],
  };
}

function extractImageFromObject(obj: Record<string, unknown>): ToolResultImage | null {
  const type = typeof obj.type === "string" ? obj.type.toLowerCase() : "";
  const source = obj.source && typeof obj.source === "object" ? (obj.source as Record<string, unknown>) : null;
  const alt = typeof obj.alt === "string" ? obj.alt : "tool-result-image";

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

function buildSvgPreviewSrc(filePath: string, content: string): string | null {
  const looksLikeSvgPath = filePath.toLowerCase().endsWith(".svg");
  const trimmed = content.trim();
  const looksLikeSvgContent =
    /^<svg[\s>]/i.test(trimmed) ||
    /^<\?xml[\s\S]*?<svg[\s>]/i.test(trimmed);

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

function formatFileContentForRender(content: string, filePath: string): string {
  const trimmed = content.trim();
  if (!trimmed) return content;
  if (trimmed.startsWith("```")) return content;

  const lang = languageFromPath(filePath);
  if (!lang || lang === "markdown") return content;

  return `\`\`\`${lang}\n${content}\n\`\`\``;
}

function languageFromPath(filePath: string): string | null {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (!ext) return null;

  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    rs: "rust",
    py: "python",
    go: "go",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    c: "c",
    cc: "cpp",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    json: "json",
    yml: "yaml",
    yaml: "yaml",
    toml: "toml",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    sql: "sql",
    html: "html",
    css: "css",
    xml: "xml",
    svg: "xml",
    md: "markdown",
  };

  return map[ext] ?? null;
}

function isMediaFilePath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif|mp4|webm|mov|mp3|wav|ogg)$/i.test(lower);
}

function ToolResultImages({ images }: { images: ToolResultImage[] }) {
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {images.map((image, index) => (
        <ImageWithFallback
          key={`${image.src}-${index}`}
          src={image.src}
          alt={image.alt}
          className="max-h-[360px]"
        />
      ))}
    </div>
  );
}

function ImageWithFallback({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={cn("rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground", className)}>
        <p className="font-medium">Image preview unavailable</p>
        <p className="mt-1 break-all text-[11px]">
          {src.startsWith("data:") ? "data:image/* (inline)" : src}
        </p>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={900}
      unoptimized
      onError={() => setFailed(true)}
      className={cn("h-auto w-full rounded-md border object-contain", className)}
    />
  );
}

function formatRawPayloadForDisplay(raw?: string): string {
  const text = (raw ?? "").trim();
  if (!text) return "";

  try {
    const parsed = JSON.parse(text) as unknown;
    return formatStructuredPayload(parsed);
  } catch {
    return normalizeToolResultOutput(raw);
  }
}

function formatStructuredPayload(value: unknown): string {
  if (!value || typeof value !== "object") {
    return normalizeToolResultOutput(String(value ?? ""));
  }

  const obj = value as Record<string, unknown>;
  const sections: string[] = [];

  if (typeof obj.type === "string") {
    sections.push(`**type**: \`${obj.type}\``);
  }
  if (typeof obj.filePath === "string") {
    sections.push(`**filePath**: \`${obj.filePath}\``);
  }
  if (typeof obj.message === "string" && obj.message.trim()) {
    sections.push(`**message**: ${obj.message}`);
  }
  if (typeof obj.content === "string" && obj.content.trim()) {
    sections.push(asMarkdownSection("content", obj.content));
  }
  if (typeof obj.newString === "string" && obj.newString.trim()) {
    sections.push(asMarkdownSection("newString", obj.newString));
  }
  if (typeof obj.oldString === "string" && obj.oldString.trim()) {
    sections.push(asMarkdownSection("oldString", obj.oldString));
  }
  if (obj.file && typeof obj.file === "object") {
    const fileObj = obj.file as Record<string, unknown>;
    if (typeof fileObj.filePath === "string") {
      sections.push(`**file.filePath**: \`${fileObj.filePath}\``);
    }
    if (typeof fileObj.content === "string" && fileObj.content.trim()) {
      sections.push(asMarkdownSection("file.content", fileObj.content));
    }
  }

  if (sections.length > 0) {
    return sections.join("\n\n");
  }

  return "```json\n" + JSON.stringify(value, null, 2) + "\n```";
}

function asMarkdownSection(title: string, value: string): string {
  const normalized = normalizeToolResultOutput(value).trim();
  if (!normalized) return `**${title}**: (empty)`;
  return [`**${title}**:`, "", normalized].join("\n");
}

async function copyText(value: string): Promise<boolean> {
  try {
    await writeText(value);
    return true;
  } catch {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }
}

function postProcessToolResultText(text: string): string {
  const cleaned = normalizeXmlLikeTags(text).trim();
  if (!cleaned) return "";

  const lines = cleaned.split("\n");
  const arrowLineRe = /^\s*\d+\u2192/; // e.g. "12→foo"
  const arrowLineCount = lines.filter((l) => arrowLineRe.test(l)).length;

  // If most lines are "N→...", this is likely terminal line-number dump.
  if (lines.length > 0 && arrowLineCount / lines.length >= 0.6) {
    const normalized = lines
      .map((l) => l.replace(/^\s*\d+\u2192\s?/, ""))
      .join("\n")
      .trim();
    return normalized;
  }

  return cleaned;
}

function normalizeXmlLikeTags(text: string): string {
  return renderXmlLikeMetaTags(text);
}
