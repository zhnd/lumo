import type { ClaudeProjectSummary } from "@/src/generated/typeshare-types";

export interface ProjectListProps {
  projects: ClaudeProjectSummary[];
  selectedProjectPath: string | null;
  totalSessions: number;
  onSelectProject: (projectPath: string | null) => void;
}
