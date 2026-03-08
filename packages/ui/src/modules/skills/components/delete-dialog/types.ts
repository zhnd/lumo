export interface DeleteSkillDialogProps {
  skillName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}
