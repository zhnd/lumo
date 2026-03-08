import {
  LayoutDashboard,
  History,
  Wrench,
  BarChart3,
  Gauge,
  Sparkles,
  Puzzle,
} from "lucide-react";
import type { NavItem } from "./types";

export const NAV_ITEMS = [
  {
    id: "overview",
    label: "Overview",
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
    label: "Performance",
    icon: BarChart3,
  },
  {
    id: "usage",
    label: "Usage",
    icon: Gauge,
  },
  {
    id: "skills",
    label: "Skills",
    icon: Puzzle,
  },
  {
    id: "wrapped",
    label: "Wrapped",
    icon: Sparkles,
  },
] as const satisfies readonly NavItem[];
