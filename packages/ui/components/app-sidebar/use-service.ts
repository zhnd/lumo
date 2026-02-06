"use client";

import { usePathname, useRouter } from "next/navigation";
import { NAV_ITEMS } from "./constants";
import type { UseServiceReturn } from "./types";

const ROUTE_MAP: Record<string, string> = {
  dashboard: "/",
  sessions: "/sessions",
  tools: "/tools",
  analytics: "/analytics",
  wrapped: "/wrapped",
} as const;

const NAV_ROUTES = [
  { prefix: "/sessions", id: "sessions" },
  { prefix: "/tools", id: "tools" },
  { prefix: "/analytics", id: "analytics" },
  { prefix: "/wrapped", id: "wrapped" },
] as const;

function resolveActiveItem(pathname: string): string {
  if (pathname === "/") return "dashboard";
  for (const route of NAV_ROUTES) {
    if (pathname === route.prefix || pathname.startsWith(route.prefix + "/")) {
      return route.id;
    }
  }
  return "dashboard";
}

export function useService(): UseServiceReturn {
  const router = useRouter();
  const pathname = usePathname();

  const activeItem = resolveActiveItem(pathname);

  const handleNavItemClick = (id: string) => {
    const route = ROUTE_MAP[id];
    if (route) {
      router.push(route);
    }
  };

  return {
    navItems: [...NAV_ITEMS],
    activeItem,
    onNavItemClick: handleNavItemClick,
  };
}
