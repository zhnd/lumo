import type { SkillsScope } from "../../types";

export interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: SkillsScope;
  onCreated: (path: string) => void;
}
