import type { ClaudeContentBlock, ClaudeMessage } from "@/src/generated/typeshare-types";

/**
 * Format date for display
 */
export function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format relative time
 */
export function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Get project name from path
 */
export function getProjectName(projectPath: string): string {
  const parts = projectPath.split("/");
  return parts[parts.length - 1] || projectPath;
}

/**
 * Get a short session ID
 */
export function getShortId(sessionId: string): string {
  return sessionId.slice(0, 8);
}

/**
 * Format message time
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get model display name
 */
export function getModelDisplayName(model: string | undefined): string {
  if (!model) return "";

  // claude-opus-4-5-20251101 -> Claude Opus 4.5
  // claude-sonnet-4-20250514 -> Claude Sonnet 4
  const parts = model.split("-");
  if (parts[0] === "claude" && parts.length >= 3) {
    const name = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    const version = parts[2];
    // Check if version has a dot version (like 4-5 for 4.5)
    if (parts[3] && !isNaN(Number(parts[3]))) {
      return `${name} ${version}.${parts[3]}`;
    }
    return `${name} ${version}`;
  }

  return model;
}

export function isRenderableMessage(message: ClaudeMessage): boolean {
  const hasText = !!message.text?.trim();
  const hasTools = !!message.toolUses?.length;
  const hasBlocks = !!message.blocks?.some(isRenderableBlock);
  return hasText || hasTools || hasBlocks;
}

export function isEssentialMessage(message: ClaudeMessage): boolean {
  const blocks = message.blocks ?? [];
  const hasToolUse = blocks.some((b) => b.type === "tool_use" && !!b.name?.trim());
  const hasToolResult = blocks.some(
    (b) => b.type === "tool_result" && (!!b.output?.trim() || !!b.fileContent?.trim() || !!b.rawJson?.trim()),
  );
  const hasVisibleText = blocks.some((b) => b.type === "text" && !!b.text?.trim()) || !!message.text?.trim();

  // Keep user/assistant turns, tool interactions; drop pure thinking/system noise in essential mode.
  if (message.type === "system") return false;
  if (hasToolUse || hasToolResult) return true;
  return hasVisibleText;
}

export function filterSessionMessages(
  messages: ClaudeMessage[],
  showEssentialOnly: boolean,
): ClaudeMessage[] {
  const renderable = messages.filter(isRenderableMessage);
  if (!showEssentialOnly) return renderable;
  return renderable.filter(isEssentialMessage);
}

export interface SessionHighlights {
  toolCalls: number;
  toolResults: number;
  failureCount: number;
  touchedFiles: number;
}

export function buildSessionHighlights(messages: ClaudeMessage[]): SessionHighlights {
  const files = new Set<string>();
  let toolCalls = 0;
  let toolResults = 0;
  let failureCount = 0;

  for (const message of messages) {
    for (const block of message.blocks ?? []) {
      if (block.type === "tool_use") toolCalls += 1;
      if (block.type === "tool_result") {
        toolResults += 1;
        if (block.isError) failureCount += 1;
        if (block.filePath?.trim()) files.add(block.filePath.trim());
      }
    }
  }

  return {
    toolCalls,
    toolResults,
    failureCount,
    touchedFiles: files.size,
  };
}

function isRenderableBlock(block: ClaudeContentBlock): boolean {
  if (block.type === "text" || block.type === "thinking" || block.type === "redacted_thinking") {
    return !!block.text?.trim();
  }
  if (block.type === "tool_use") return !!block.name?.trim();
  if (block.type === "tool_result") {
    return !!block.output?.trim() || !!block.fileContent?.trim() || !!block.rawJson?.trim();
  }
  return false;
}
