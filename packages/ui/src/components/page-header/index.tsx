"use client";

import { Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { type DaemonStatus, useDaemonStatus } from "./use-daemon-status";

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

const STATUS_CONFIG: Record<DaemonStatus, { label: string; color: string }> = {
  connected: { label: "Daemon", color: "text-green-500" },
  disconnected: { label: "Offline", color: "text-red-500" },
};

export function PageHeader({ title, children }: PageHeaderProps) {
  const daemonStatus = useDaemonStatus();

  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="size-8 shrink-0" />
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          <Badge variant="outline" className="shrink-0 gap-1 font-normal">
            <Circle
              className={`size-2 fill-current ${STATUS_CONFIG[daemonStatus].color}`}
            />
            <span className="hidden sm:inline">
              {STATUS_CONFIG[daemonStatus].label}
            </span>
          </Badge>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </header>
  );
}
