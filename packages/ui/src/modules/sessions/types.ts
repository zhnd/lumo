import type {
  ClaudeProjectSummary,
  ClaudeSession,
  ClaudeSessionPage,
} from "@/generated/typeshare-types";

export type { ClaudeSession };
export type { ClaudeSessionPage };

export interface UseServiceReturn {
  sessions: ClaudeSession[];
  filteredSessions: ClaudeSession[];
  projects: ClaudeProjectSummary[];
  selectedProjectPath: string | null;
  setSelectedProjectPath: (projectPath: string | null) => void;
  totalSessions: number;
  selectedProjectName: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  refetch: () => void;
}

export interface SessionsModuleProps {
  sessions: ClaudeSession[];
}
