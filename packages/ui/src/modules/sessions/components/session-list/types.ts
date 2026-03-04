import type { ClaudeSession } from "../../types";

export interface SessionListProps {
  sessions: ClaudeSession[];
  onSelectSession: (session: ClaudeSession) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export interface SessionListItemProps {
  session: ClaudeSession;
  onSelect: () => void;
}
