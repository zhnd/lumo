import type { ClaudeProjectSummary } from "@/generated/typeshare-types";

export interface ScopeSelectorProps {
  projects: ClaudeProjectSummary[];
  value: string | null;
  onChange: (value: string | null) => void;
  counts?: Record<string, number>;
  globalCount?: number;
}
