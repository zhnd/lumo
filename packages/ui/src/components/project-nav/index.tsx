"use client";

import { FolderOpen, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectNavProps } from "./types";

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function abbreviatePath(fullPath: string): string {
  const home = "/Users/";
  if (fullPath.startsWith(home)) {
    const afterHome = fullPath.slice(home.length);
    return `~/${afterHome.slice(afterHome.indexOf("/") + 1)}`;
  }
  return fullPath;
}

export function ProjectNav({
  projects,
  selected,
  onSelect,
  allLabel = "All Projects",
  allIcon,
  allBadge,
  counts,
  showDetails = true,
  widthClass = "md:w-72",
}: ProjectNavProps) {
  const AllIcon = allIcon ?? (
    <Layers className="size-3.5 text-muted-foreground" />
  );
  const AllIconDesktop = allIcon ?? (
    <Layers className="size-4 text-muted-foreground" />
  );

  return (
    <div
      className={cn(
        "sticky top-0 z-20 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 md:static md:z-auto md:shrink-0 md:overflow-hidden md:border-r md:border-b-0 md:bg-muted/20 md:backdrop-blur-0",
        widthClass,
      )}
    >
      {/* Mobile: wrapped pills */}
      <div className="border-b px-3 py-2 md:hidden">
        <div className="flex flex-wrap gap-1.5">
          <button
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-accent",
              selected === null
                ? "border-primary/40 bg-accent"
                : "border-border bg-background",
            )}
            onClick={() => onSelect(null)}
            type="button"
          >
            {AllIcon}
            <span className="font-medium">{allLabel}</span>
            {allBadge != null && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                {allBadge}
              </Badge>
            )}
          </button>

          {projects.map((project) => {
            const isActive = selected === project.projectPath;
            const count = counts?.[project.projectPath];
            return (
              <button
                key={project.projectPath}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-accent",
                  isActive
                    ? "border-primary/40 bg-accent"
                    : "border-border bg-background",
                )}
                onClick={() => onSelect(project.projectPath)}
                type="button"
                title={project.projectPath}
              >
                <FolderOpen className="size-3.5 text-muted-foreground" />
                <span className="max-w-28 truncate font-medium">
                  {project.projectName}
                </span>
                {count != null && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: vertical sidebar */}
      <div className="hidden overflow-hidden md:block">
        <div className="border-b px-3 py-2">
          <button
            className={cn(
              "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
              selected === null && "bg-accent",
            )}
            onClick={() => onSelect(null)}
            type="button"
          >
            <div className="flex items-center gap-2">
              {AllIconDesktop}
              <span className="font-medium">{allLabel}</span>
            </div>
            {allBadge != null && <Badge variant="secondary">{allBadge}</Badge>}
          </button>
        </div>

        <div className="h-[calc(100%-49px)] overflow-y-auto">
          <div className="space-y-1 p-2">
            {projects.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No projects found
              </p>
            )}
            {projects.map((project) => {
              const isActive = selected === project.projectPath;
              const count = counts?.[project.projectPath];
              return (
                <button
                  key={project.projectPath}
                  className={cn(
                    "w-full min-w-0 rounded-md border px-2 py-2 text-left transition-colors hover:bg-accent/60",
                    isActive
                      ? "border-primary/40 bg-accent"
                      : "border-transparent",
                  )}
                  onClick={() => onSelect(project.projectPath)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">
                        {project.projectName}
                      </span>
                    </div>
                    {count != null && (
                      <Badge variant="secondary" className="shrink-0">
                        {count}
                      </Badge>
                    )}
                  </div>

                  {showDetails && (
                    <>
                      <p
                        className="mt-1 truncate text-xs text-muted-foreground"
                        title={project.projectPath}
                      >
                        {abbreviatePath(project.projectPath)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatTimeAgo(project.lastUpdated)}
                      </p>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
