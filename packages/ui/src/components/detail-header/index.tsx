"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { DetailHeaderProps } from "./types";

export function DetailHeader({
  title,
  subtitle,
  badges,
  onBack,
  actions,
  meta,
}: DetailHeaderProps) {
  return (
    <div className="shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <SidebarTrigger className="size-8 shrink-0" />

        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          {badges}
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>

      {subtitle && (
        <div className="border-t px-4 py-1.5">
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      )}

      {meta && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 text-xs text-muted-foreground">
          {meta}
        </div>
      )}
    </div>
  );
}
