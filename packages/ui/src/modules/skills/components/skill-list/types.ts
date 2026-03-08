import type { SkillSummary } from "@/generated/typeshare-types";

export interface SkillListProps {
  skills: SkillSummary[];
  onSelect: (path: string) => void;
  onUninstall: (path: string) => void;
  isUninstalling: boolean;
}
