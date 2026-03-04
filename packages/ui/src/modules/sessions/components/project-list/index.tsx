"use client";

import { FolderOpen, Layers, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatTimeAgo, truncate } from "../../libs";
import type { ProjectListProps } from "./types";

export function ProjectList({
  projects,
  selectedProjectPath,
  totalSessions,
  onSelectProject,
}: ProjectListProps) {
  return (
    <div className="sticky top-0 z-20 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static md:z-auto md:w-72 md:border-r md:border-b-0 md:bg-muted/20 md:backdrop-blur-0">
      <div className="border-b px-3 py-2 md:block">
        <div className="md:hidden">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-1">
              <button
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-accent",
                  selectedProjectPath === null
                    ? "border-primary/40 bg-accent"
                    : "border-border bg-background",
                )}
                onClick={() => onSelectProject(null)}
                type="button"
              >
                <Layers className="size-3.5 text-muted-foreground" />
                <span className="font-medium">All</span>
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {totalSessions}
                </Badge>
              </button>

              {projects.map((project) => {
                const isActive = selectedProjectPath === project.projectPath;
                return (
                  <button
                    key={project.projectPath}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-accent",
                      isActive
                        ? "border-primary/40 bg-accent"
                        : "border-border bg-background",
                    )}
                    onClick={() => onSelectProject(project.projectPath)}
                    type="button"
                    title={project.projectPath}
                  >
                    <FolderOpen className="size-3.5 text-muted-foreground" />
                    <span className="max-w-28 truncate font-medium">
                      {project.projectName}
                    </span>
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                      {project.sessionCount}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <button
          className={cn(
            "hidden w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent md:flex",
            selectedProjectPath === null && "bg-accent",
          )}
          onClick={() => onSelectProject(null)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-muted-foreground" />
            <span className="font-medium">All Projects</span>
          </div>
          <Badge variant="secondary">{totalSessions}</Badge>
        </button>
      </div>

      <ScrollArea className="hidden h-[calc(100%-49px)] md:block">
        <div className="space-y-1 p-2">
          {projects.map((project) => {
            const isActive = selectedProjectPath === project.projectPath;
            return (
              <button
                key={project.projectPath}
                className={cn(
                  "w-full rounded-md border px-2 py-2 text-left transition-colors hover:bg-accent/60",
                  isActive ? "border-primary/40 bg-accent" : "border-transparent",
                )}
                onClick={() => onSelectProject(project.projectPath)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">
                      {project.projectName}
                    </span>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {project.sessionCount}
                  </Badge>
                </div>

                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {truncate(project.projectPath, 56)}
                </p>

                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  <span>{formatTimeAgo(project.lastUpdated)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
