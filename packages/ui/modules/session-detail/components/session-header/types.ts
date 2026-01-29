import type { ClaudeSession, ClaudeSessionStats } from "../../types";

export interface SessionHeaderProps {
  session: ClaudeSession;
  messageCount: number;
  stats: ClaudeSessionStats;
  onBack: () => void;
}
