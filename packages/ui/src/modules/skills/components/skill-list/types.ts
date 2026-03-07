import type { SkillSummary } from "@/generated/typeshare-types";

export interface SkillListProps {
  skills: SkillSummary[];
  onSelect: (name: string) => void;
  onUninstall: (name: string) => void;
  isUninstalling: boolean;
}
