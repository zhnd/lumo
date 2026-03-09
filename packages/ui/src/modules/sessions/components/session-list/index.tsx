"use client";

import { Clock, MessageSquare } from "lucide-react";
import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTimeAgo, truncate } from "../../libs";
import type { SessionListProps } from "./types";

export function SessionList({
  sessions,
  onSelectSession,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: SessionListProps) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || !loadMoreRef.current || !scrollAreaRef.current) {
      return;
    }

    const viewport = scrollAreaRef.current.querySelector<HTMLElement>(
      "[data-slot='scroll-area-viewport']",
    );
    if (!viewport) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore) {
          onLoadMore();
        }
      },
      {
        root: viewport,
        rootMargin: "160px 0px",
      },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

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
    <div ref={scrollAreaRef} className="h-full">
      <ScrollArea className="h-full">
        <div className="space-y-2 p-3 md:p-4">
          {sessions.map((session) => (
            <Card
              key={session.sessionId}
              className="cursor-pointer gap-2 py-3 transition-colors hover:bg-accent/50"
              onClick={() => onSelectSession(session)}
            >
              <CardContent className="px-3 py-0 md:px-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-6">
                    {session.summary ||
                      truncate(session.firstPrompt || "No prompt", 100)}
                  </p>
                  <div className="mt-0.5 flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="size-3" />
                    <span>
                      {formatTimeAgo(session.lastUpdated || session.modified)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {(hasMore || isLoadingMore) && (
            <div
              ref={loadMoreRef}
              className="flex min-h-12 items-center justify-center text-xs text-muted-foreground"
            >
              {isLoadingMore ? "Loading more sessions..." : "Scroll for more"}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
