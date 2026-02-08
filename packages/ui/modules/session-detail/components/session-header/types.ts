import type { ClaudeSession, ClaudeSessionStats } from "../../types";

export interface SessionHeaderProps {
  session: ClaudeSession;
  messageCount: number;
  stats: ClaudeSessionStats;
  collapsed?: boolean;
  onBack: () => void;
}
