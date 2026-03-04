import type { LucideIcon } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface UseServiceReturn {
  navItems: NavItem[];
  activeItem: string;
  onNavItemClick: (id: string) => void;
}
