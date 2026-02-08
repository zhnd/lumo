import type {
  ClaudeSession,
  ClaudeSessionDetail,
  ClaudeSessionStats,
  ClaudeMessage,
  ClaudeToolUse,
} from "@/src/generated/typeshare-types";
import type { Virtualizer } from "@tanstack/react-virtual";
import type { RefObject } from "react";
import type { SessionHighlights } from "./libs";

export type { ClaudeSession, ClaudeSessionDetail, ClaudeSessionStats, ClaudeMessage, ClaudeToolUse };

export interface SessionDetailModuleProps {
  sessionPath: string;
}

export interface UseServiceReturn {
  sessionDetail: ClaudeSessionDetail | null;
  messages: ClaudeMessage[];
  totalMessageCount: number;
  visibleMessageCount: number;
  showEssentialOnly: boolean;
  toggleEssentialOnly: () => void;
  highlights: SessionHighlights | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  showScrollToBottom: boolean;
  scrollToBottom: () => void;
  isInitialRenderReady: boolean;
  isTopCollapsed: boolean;
  onBack: () => void;
  isLoading: boolean;
  error: Error | null;
}
