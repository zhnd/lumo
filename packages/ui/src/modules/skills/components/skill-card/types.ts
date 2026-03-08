import type { SkillSummary } from "@/generated/typeshare-types";

export interface SkillCardProps {
  skill: SkillSummary;
  onSelect: (name: string) => void;
  onUninstall: (name: string) => void;
  isUninstalling: boolean;
}
