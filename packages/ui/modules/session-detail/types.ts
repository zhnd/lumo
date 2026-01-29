import type {
  ClaudeSession,
  ClaudeSessionDetail,
  ClaudeSessionStats,
  ClaudeMessage,
  ClaudeToolUse,
} from "@/src/generated/typeshare-types";

export type { ClaudeSession, ClaudeSessionDetail, ClaudeSessionStats, ClaudeMessage, ClaudeToolUse };

export interface SessionDetailModuleProps {
  sessionPath: string;
}

export interface UseServiceReturn {
  sessionDetail: ClaudeSessionDetail | null;
  isLoading: boolean;
  error: Error | null;
}
