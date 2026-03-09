"use client";

import {
  Calendar,
  Clock,
  Coins,
  FolderOpen,
  GitBranch,
  MessageSquare,
  Timer,
  Zap,
} from "lucide-react";
import { DetailHeader } from "@/components/detail-header";
import { Badge } from "@/components/ui/badge";
import { fmt, formatDurationMixed } from "@/lib/format";
import {
  formatDate,
  formatTimeAgo,
  getProjectName,
  getShortId,
} from "../../libs";
import type { SessionHeaderProps } from "./types";

export function SessionHeader({
  session,
  messageCount,
  turnCount,
  stats,
  collapsed = false,
  onBack,
}: SessionHeaderProps) {
  const title =
    session.summary ||
    session.firstPrompt ||
    `Session ${getShortId(session.sessionId)}`;

  return (
    <DetailHeader
      title={title}
      onBack={onBack}
      badges={
        <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
          {getShortId(session.sessionId)}
        </Badge>
      }
      actions={undefined}
      meta={
        !collapsed ? (
          <>
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
              <span>
                {formatTimeAgo(session.lastUpdated || session.modified)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <MessageSquare className="size-3.5" />
              <span>
                {turnCount} turns · {messageCount} messages
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Coins className="size-3.5" />
              <span>{fmt(stats.estimatedCostUsd, "currency")}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Zap className="size-3.5" />
              <span>
                {fmt(
                  stats.totalInputTokens +
                    stats.totalOutputTokens +
                    stats.totalCacheReadTokens +
                    stats.totalCacheCreationTokens,
                )}{" "}
                tokens
              </span>
            </div>

            {stats.durationSeconds > 0 && (
              <div className="flex items-center gap-1.5">
                <Timer className="size-3.5" />
                <span>{formatDurationMixed(stats.durationSeconds)}</span>
              </div>
            )}
          </>
        ) : undefined
      }
    />
  );
}
