"use client";

import {
  ArrowLeft,
  GitBranch,
  FolderOpen,
  Calendar,
  Clock,
  MessageSquare,
  Coins,
  Zap,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmt, formatDurationMixed } from "@/lib/format";
import type { SessionHeaderProps } from "./types";
import { formatDate, formatTimeAgo, getProjectName, getShortId } from "../../libs";

export function SessionHeader({
  session,
  messageCount,
  stats,
  onBack,
}: SessionHeaderProps) {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top bar with back button and title */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">
            {session.summary || `Session ${getShortId(session.sessionId)}`}
          </h1>
          {session.firstPrompt && !session.summary && (
            <p className="truncate text-xs text-muted-foreground">
              {session.firstPrompt}
            </p>
          )}
        </div>

        <Badge variant="outline" className="shrink-0 font-mono text-xs">
          {getShortId(session.sessionId)}
        </Badge>
      </div>

      {/* Meta info bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <FolderOpen className="size-3.5" />
          <span>{getProjectName(session.projectPath)}</span>
        </div>

        {session.gitBranch && (
          <div className="flex items-center gap-1.5">
            <GitBranch className="size-3.5" />
            <span>{session.gitBranch}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5" />
          <span>{formatDate(session.created)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          <span>{formatTimeAgo(session.lastUpdated || session.modified)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <MessageSquare className="size-3.5" />
          <span>{messageCount} messages</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Coins className="size-3.5" />
          <span>{fmt(stats.estimatedCostUsd, "currency")}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Zap className="size-3.5" />
          <span>{fmt(stats.totalInputTokens + stats.totalOutputTokens + stats.totalCacheReadTokens + stats.totalCacheCreationTokens)} tokens</span>
        </div>

        {stats.durationSeconds > 0 && (
          <div className="flex items-center gap-1.5">
            <Timer className="size-3.5" />
            <span>{formatDurationMixed(stats.durationSeconds)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
