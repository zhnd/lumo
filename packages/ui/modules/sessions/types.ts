import type {
  ClaudeProjectSummary,
  ClaudeSession,
} from "@/src/generated/typeshare-types";

export type { ClaudeSession };

export interface UseServiceReturn {
  sessions: ClaudeSession[];
  filteredSessions: ClaudeSession[];
  projects: ClaudeProjectSummary[];
  selectedProjectPath: string | null;
  setSelectedProjectPath: (projectPath: string | null) => void;
  totalSessions: number;
  selectedProjectName: string;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface SessionsModuleProps {
  sessions: ClaudeSession[];
}
