import type {
  ClaudeContentBlock,
  ClaudeMessage,
} from "@/generated/typeshare-types";
import {
  extractSlashCommand,
  sanitizeMessageText,
  stripAnsiCodes,
} from "./components/shared/text-utils";
import type {
  TimelineItem,
  TimelineToolGroupItem,
  TimelineToolItem,
  TimelineUserItem,
  ToolGroupCategory,
} from "./types";

export interface SessionHighlights {
  toolCalls: number;
  toolResults: number;
  failureCount: number;
  touchedFiles: number;
}

interface ToolResultSnapshot {
  timestamp: string;
  output?: string;
  filePath?: string;
  fileContent?: string;
  isError?: boolean;
}

const INTERRUPTION_PREFIXES = [
  "[Request interrupted by user",
  "The user doesn't want to proceed with this tool use",
  "User rejected tool use",
];

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

export function getProjectName(projectPath: string): string {
  const parts = projectPath.split("/");
  return parts[parts.length - 1] || projectPath;
}

export function getShortId(sessionId: string): string {
  return sessionId.slice(0, 8);
}

export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getModelDisplayName(model: string | undefined): string {
  if (!model) return "";

  const parts = model.split("-");
  if (parts[0] === "claude" && parts.length >= 3) {
    const name = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    const version = parts[2];
    if (parts[3] && !Number.isNaN(Number(parts[3]))) {
      return `${name} ${version}.${parts[3]}`;
    }
    return `${name} ${version}`;
  }

  return model;
}

export function buildFlatTimeline(messages: ClaudeMessage[]): TimelineItem[] {
  const toolResultsById = collectToolResults(messages);
  const consumedToolResults = new Set<string>();
  const items: TimelineItem[] = [];

  for (const message of messages) {
    const role = normalizeRole(message.type);

    // User prompt messages (without tool results)
    if (role === "user") {
      const hasToolResult = (message.blocks ?? []).some(
        (b) => b.type === "tool_result",
      );
      if (!hasToolResult) {
        const userItem = extractUserItem(message);
        if (userItem) {
          items.push(userItem);
          continue;
        }
      }
    }

    // Process blocks for assistant/system messages and user messages with tool results
    const messageItems = buildFlatMessageItems(
      message,
      toolResultsById,
      consumedToolResults,
    );
    items.push(...messageItems);
  }

  return mergeAdjacentAssistantItems(items);
}

function buildFlatMessageItems(
  message: ClaudeMessage,
  toolResultsById: Map<string, ToolResultSnapshot>,
  consumedToolResults: Set<string>,
): TimelineItem[] {
  const items: TimelineItem[] = [];
  const role = normalizeRole(message.type);

  for (const [index, block] of (message.blocks ?? []).entries()) {
    if (block.type === "thinking") {
      const text = block.text?.trim();
      if (!text) continue;
      items.push({
        id: `${message.uuid}-thinking-${index}`,
        kind: "thinking",
        timestamp: message.timestamp,
        text,
        redacted: false,
      });
      continue;
    }

    if (block.type === "redacted_thinking") {
      items.push({
        id: `${message.uuid}-redacted-${index}`,
        kind: "thinking",
        timestamp: message.timestamp,
        text: "Thinking content redacted for safety.",
        redacted: true,
      });
      continue;
    }

    if (block.type === "text") {
      const rawText = block.text?.trim();
      if (!rawText || isInterruptionText(rawText)) continue;

      const handled = routeTextBlock(rawText, message, index, items);
      if (handled) continue;
    }

    if (block.type === "tool_use" && block.name?.trim() && block.toolUseId) {
      const result = toolResultsById.get(block.toolUseId);
      if (result) {
        consumedToolResults.add(block.toolUseId);
      }
      items.push({
        id: `${message.uuid}-tool-${block.toolUseId}-${index}`,
        kind: "tool",
        timestamp: result?.timestamp ?? message.timestamp,
        toolUseId: block.toolUseId,
        toolName: block.name.trim(),
        input: block.input,
        output: result?.output,
        filePath: result?.filePath,
        fileContent: result?.fileContent,
        isError: result?.isError,
        model: message.model,
      });
      continue;
    }

    if (block.type === "tool_result") {
      if (block.toolUseId && consumedToolResults.has(block.toolUseId)) {
        continue;
      }
      if (!hasRenderableToolResult(block)) continue;
      items.push({
        id: `${message.uuid}-tool-result-${block.toolUseId ?? index}`,
        kind: "tool",
        timestamp: message.timestamp,
        toolUseId: block.toolUseId ?? `${message.uuid}-${index}`,
        toolName: "Tool Result",
        output: block.output ?? block.rawJson,
        filePath: block.filePath,
        fileContent: block.fileContent,
        isError: block.isError,
        model: message.model,
      });
    }
  }

  return items;
}

function extractUserItem(message: ClaudeMessage): TimelineUserItem | null {
  // Use routeTextBlock for consistent handling of all text formats.
  // Collect items, then return the first user item (if any).
  const items: TimelineItem[] = [];

  for (const [index, block] of (message.blocks ?? []).entries()) {
    if (block.type !== "text" || !block.text?.trim()) continue;

    const rawText = block.text.trim();
    if (isInterruptionText(rawText)) continue;

    routeTextBlock(rawText, message, index, items);
  }

  // Return the first user item, with any commandOutput attached
  const firstUser = items.find((i) => i.kind === "user");
  return (firstUser as TimelineUserItem) ?? null;
}

function mergeAdjacentAssistantItems(items: TimelineItem[]): TimelineItem[] {
  const merged: TimelineItem[] = [];

  for (const item of items) {
    const previous = merged[merged.length - 1];
    if (
      previous?.kind === "assistant" &&
      item.kind === "assistant" &&
      previous.model === item.model
    ) {
      previous.text = `${previous.text}\n\n${item.text}`;
      continue;
    }
    merged.push({ ...item });
  }

  return merged;
}

export function buildSessionHighlights(
  messages: ClaudeMessage[],
): SessionHighlights {
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

function collectToolResults(
  messages: ClaudeMessage[],
): Map<string, ToolResultSnapshot> {
  const toolResultsById = new Map<string, ToolResultSnapshot>();

  for (const message of messages) {
    for (const block of message.blocks ?? []) {
      if (block.type !== "tool_result" || !block.toolUseId) continue;
      toolResultsById.set(block.toolUseId, {
        timestamp: message.timestamp,
        output: block.output,
        filePath: block.filePath,
        fileContent: block.fileContent,
        isError: block.isError,
      });
    }
  }

  return toolResultsById;
}

function hasRenderableToolResult(block: ClaudeContentBlock): boolean {
  return (
    !!block.output?.trim() ||
    !!block.fileContent?.trim() ||
    !!block.rawJson?.trim()
  );
}

function isInterruptionText(text: string): boolean {
  const trimmed = text.trim();
  return INTERRUPTION_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

function normalizeRole(
  type: ClaudeMessage["type"],
): "user" | "assistant" | "system" {
  if (type === "assistant" || type === "system") return type;
  return "user";
}

/**
 * Route a text block to the correct timeline item type.
 * Handles all Claude Code special message formats:
 * - caveat messages (hidden)
 * - slash commands (/config, /exit)
 * - command stdout/stderr output
 * - regular user text
 * - assistant/system text with metadata sanitization
 *
 * Returns true if handled (item pushed or skipped), false if caller should handle.
 */
function routeTextBlock(
  rawText: string,
  message: ClaudeMessage,
  blockIndex: number,
  items: TimelineItem[],
): boolean {
  const role = normalizeRole(message.type);

  // 1. Caveat messages — always hide
  if (rawText.startsWith("<local-command-caveat>")) {
    return true; // skip
  }

  // 2. Slash command metadata — parse as /command
  const command = extractSlashCommand(rawText);
  if (command) {
    const commandOutput = command.stdout
      ? stripAnsiCodes(command.stdout).trim() || undefined
      : undefined;
    const name = command.name.startsWith("/")
      ? command.name
      : `/${command.name}`;
    items.push({
      id: `${message.uuid}-prompt-${blockIndex}`,
      kind: "user",
      timestamp: message.timestamp,
      text: `${name}${command.args ? ` ${command.args}` : ""}`,
      commandOutput,
    });
    return true;
  }

  // 3. Command stdout/stderr — attach to previous command or show inline
  if (
    rawText.startsWith("<local-command-stdout>") ||
    rawText.startsWith("<local-command-stderr>") ||
    rawText.startsWith("<bash-stdout>") ||
    rawText.startsWith("<bash-stderr>")
  ) {
    const content = extractTagContent(rawText);
    if (!content) return true; // empty output, skip

    const cleaned = stripAnsiCodes(content).trim();
    if (!cleaned) return true;

    // Try to attach to the previous user item as commandOutput
    const lastItem = items[items.length - 1];
    if (lastItem?.kind === "user" && !lastItem.commandOutput) {
      lastItem.commandOutput = cleaned;
      return true;
    }

    // Otherwise show as standalone muted output
    items.push({
      id: `${message.uuid}-text-${blockIndex}`,
      kind: "user",
      timestamp: message.timestamp,
      text: cleaned,
    });
    return true;
  }

  // 4. User text — show as-is (plain text, no markdown processing)
  if (role === "user") {
    items.push({
      id: `${message.uuid}-text-${blockIndex}`,
      kind: "user",
      timestamp: message.timestamp,
      text: rawText,
    });
    return true;
  }

  // 5. Assistant/system text — sanitize metadata tags
  const text = sanitizeMessageText(rawText);
  if (!text) return true;

  items.push({
    id: `${message.uuid}-text-${blockIndex}`,
    kind: "assistant",
    timestamp: message.timestamp,
    text,
    model: message.model,
  });
  return true;
}

/** Extract content from a tag like `<local-command-stdout>content</local-command-stdout>` */
function extractTagContent(text: string): string | null {
  const match = text.match(/^<[^>]+>([\s\S]*)<\/[^>]+>$/);
  return match?.[1] ?? null;
}

/* ── Consecutive tool grouping ─────────────────────────────────── */

const READ_TOOLS = new Set(["Read", "Glob"]);
const SEARCH_TOOLS = new Set(["Grep", "WebSearch", "WebFetch"]);

function getGroupCategory(toolName: string): ToolGroupCategory | null {
  if (READ_TOOLS.has(toolName)) return "read";
  if (SEARCH_TOOLS.has(toolName)) return "search";
  return null;
}

/**
 * Post-process a flat timeline: merge consecutive read or search tool items
 * into `tool-group` items (minimum 2 to form a group).
 */
export function groupConsecutiveTools(items: TimelineItem[]): TimelineItem[] {
  const result: TimelineItem[] = [];
  let pendingGroup: TimelineToolItem[] = [];
  let pendingCategory: ToolGroupCategory | null = null;

  const flushGroup = () => {
    if (pendingGroup.length >= 2 && pendingCategory) {
      const group: TimelineToolGroupItem = {
        id: `group-${pendingGroup[0].id}`,
        kind: "tool-group",
        timestamp: pendingGroup[0].timestamp,
        category: pendingCategory,
        items: pendingGroup,
      };
      result.push(group);
    } else {
      result.push(...pendingGroup);
    }
    pendingGroup = [];
    pendingCategory = null;
  };

  for (const item of items) {
    if (item.kind === "tool" && !item.isError) {
      const cat = getGroupCategory(item.toolName);
      if (cat && (pendingCategory === null || pendingCategory === cat)) {
        pendingCategory = cat;
        pendingGroup.push(item);
        continue;
      }
    }
    // Item doesn't belong to current group — flush and push
    flushGroup();
    if (item.kind === "tool" && !item.isError) {
      const cat = getGroupCategory(item.toolName);
      if (cat) {
        pendingCategory = cat;
        pendingGroup.push(item);
        continue;
      }
    }
    result.push(item);
  }

  flushGroup();
  return result;
}
