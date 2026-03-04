import type { ClaudeSession, ClaudeSessionStats } from "../../types";

export interface SessionHeaderProps {
  session: ClaudeSession;
  messageCount: number;
  turnCount: number;
  stats: ClaudeSessionStats;
  collapsed?: boolean;
  onBack: () => void;
}
