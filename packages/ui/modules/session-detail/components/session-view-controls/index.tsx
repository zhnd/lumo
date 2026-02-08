"use client";

import { Filter, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionViewControlsProps } from "./types";

export function SessionViewControls({
  showEssentialOnly,
  visibleCount,
  totalCount,
  onToggleEssentialOnly,
}: SessionViewControlsProps) {
  return (
    <section className="border-b px-4 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ListTree className="size-3.5" />
          <span>
            Showing {visibleCount} / {totalCount} messages
          </span>
        </div>

        <Button
          type="button"
          variant={showEssentialOnly ? "secondary" : "outline"}
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={onToggleEssentialOnly}
        >
          <Filter className="size-3.5" />
          {showEssentialOnly ? "Essential only" : "Show all"}
        </Button>
      </div>
    </section>
  );
}
