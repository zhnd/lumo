import type { SkillSummary } from "@/generated/typeshare-types";

export interface SkillCardProps {
  skill: SkillSummary;
  onSelect: (path: string) => void;
  onUninstall: (path: string) => void;
  isUninstalling: boolean;
}
