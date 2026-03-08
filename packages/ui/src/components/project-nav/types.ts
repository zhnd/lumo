import type { ReactNode } from "react";
import type { ClaudeProjectSummary } from "@/generated/typeshare-types";

export interface ProjectNavProps {
  projects: ClaudeProjectSummary[];
  selected: string | null;
  onSelect: (projectPath: string | null) => void;
  /** Label for the "all" / "global" button. Default: "All Projects" */
  allLabel?: string;
  /** Icon for the "all" button */
  allIcon?: ReactNode;
  /** Badge content for the "all" button (e.g. total count) */
  allBadge?: ReactNode;
  /** Count to display per project, keyed by projectPath */
  counts?: Record<string, number>;
  /** Whether to show project path and last updated. Default: true */
  showDetails?: boolean;
  /** Desktop sidebar width class. Default: "md:w-72" */
  widthClass?: string;
}
