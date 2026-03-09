import type { Virtualizer } from "@tanstack/react-virtual";
import type { RefObject } from "react";
import type {
  ClaudeMessage,
  ClaudeSession,
  ClaudeSessionDetail,
  ClaudeSessionStats,
  ClaudeToolUse,
} from "@/generated/typeshare-types";
import type { SessionHighlights } from "./libs";

export type {
  ClaudeSession,
  ClaudeSessionDetail,
  ClaudeSessionStats,
  ClaudeMessage,
  ClaudeToolUse,
};

export interface TimelineUserItem {
  id: string;
  kind: "user";
  timestamp: string;
  text: string;
}

export interface TimelineAssistantItem {
  id: string;
  kind: "assistant";
  timestamp: string;
  text: string;
  model?: string;
}

export interface TimelineToolItem {
  id: string;
  kind: "tool";
  timestamp: string;
  toolName: string;
  toolUseId: string;
  input?: string;
  output?: string;
  filePath?: string;
  fileContent?: string;
  isError?: boolean;
  model?: string;
}

export interface TimelineThinkingItem {
  id: string;
  kind: "thinking";
  timestamp: string;
  text: string;
  redacted: boolean;
}

export type TimelineItem =
  | TimelineUserItem
  | TimelineAssistantItem
  | TimelineToolItem
  | TimelineThinkingItem;

export interface SessionDetailModuleProps {
  sessionPath: string;
}

export interface UseServiceReturn {
  sessionDetail: ClaudeSessionDetail | null;
  timelineItems: TimelineItem[];
  totalMessageCount: number;
  totalTurnCount: number;
  highlights: SessionHighlights | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  showScrollToBottom: boolean;
  scrollToBottom: () => void;
  isInitialRenderReady: boolean;
  isTopCollapsed: boolean;
  onBack: () => void;
  isSessionActive: boolean;
  isLoading: boolean;
  error: Error | null;
}
