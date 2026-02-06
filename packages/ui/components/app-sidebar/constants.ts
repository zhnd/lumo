import {
  LayoutDashboard,
  History,
  Wrench,
  BarChart3,
  Sparkles,
} from "lucide-react";
import type { NavItem } from "./types";

export const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "sessions",
    label: "Sessions",
    icon: History,
  },
  {
    id: "tools",
    label: "Tools",
    icon: Wrench,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    id: "wrapped",
    label: "Wrapped",
    icon: Sparkles,
  },
] as const satisfies readonly NavItem[];
