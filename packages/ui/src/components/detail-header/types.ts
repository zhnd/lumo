import type { ReactNode } from "react";

export interface DetailHeaderProps {
  title: string;
  subtitle?: string;
  /** Inline badges next to the title (version, scope, etc.) */
  badges?: ReactNode;
  onBack: () => void;
  /** Right-side actions (buttons, badges, etc.) */
  actions?: ReactNode;
  /** Secondary info bar below the title row */
  meta?: ReactNode;
}
