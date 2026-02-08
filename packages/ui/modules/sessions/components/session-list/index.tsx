"use client";

import { MessageSquare, GitBranch, FolderOpen, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SessionListProps } from "./types";
import {
  formatTimeAgo,
  getProjectName,
  truncate,
  getShortId,
} from "../../libs";

export function SessionList({ sessions, onSelectSession }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="mx-auto size-12 opacity-50" />
          <p className="mt-4 text-sm">No sessions found</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3 md:p-4">
        {sessions.map((session) => (
          <Card
            key={session.sessionId}
            className="cursor-pointer gap-2 py-3 transition-colors hover:bg-accent/50"
            onClick={() => onSelectSession(session)}
          >
            <CardContent className="px-3 py-0 md:px-4">
              {/* Summary or First Prompt */}
              <div className="mb-2">
                <p className="line-clamp-2 text-sm font-medium">
                  {session.summary ||
                    truncate(session.firstPrompt || "No prompt", 100)}
                </p>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {/* Project */}
                <div className="flex items-center gap-1">
                  <FolderOpen className="size-3" />
                  <span className="max-w-40 truncate">{getProjectName(session.projectPath)}</span>
                </div>

                {/* Git Branch */}
                {session.gitBranch && (
                  <div className="flex items-center gap-1">
                    <GitBranch className="size-3" />
                    <span className="max-w-32 truncate">{session.gitBranch}</span>
                  </div>
                )}

                {/* Message count */}
                <div className="flex items-center gap-1">
                  <MessageSquare className="size-3" />
                  <span>{session.messageCount} msgs</span>
                </div>

                {/* Time ago */}
                <div className="flex items-center gap-1">
                  <Clock className="size-3" />
                  <span>{formatTimeAgo(session.lastUpdated || session.modified)}</span>
                </div>
              </div>

              {/* Session ID badge */}
              <div className="mt-2">
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {getShortId(session.sessionId)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
