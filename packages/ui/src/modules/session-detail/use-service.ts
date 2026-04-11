"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClaudeSessionBridge } from "@/bridges/claude-session-bridge";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { useTauriEvent } from "@/hooks/use-tauri-event";
import { watcherBackedQueryOptions } from "@/lib/query-options";
import {
  buildFlatTimeline,
  buildSessionHighlights,
  groupConsecutiveTools,
} from "./libs";
import type { UseServiceReturn } from "./types";
import { useReplay } from "./use-replay";

const TOP_PANEL_SHOW_THRESHOLD = 24;
const TOP_PANEL_HIDE_THRESHOLD = 260;
const LIVE_FOLLOW_THRESHOLD_PX = 200;

interface SessionFileChangedPayload {
  sessionId: string;
  filePath: string;
}

const ACTIVE_TIMEOUT_MS = 8_000;

export function useService(sessionPath: string): UseServiceReturn {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const activeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateDetail = useCallback(
    (payload: SessionFileChangedPayload) => {
      if (sessionPath && payload.filePath === sessionPath) {
        queryClient.invalidateQueries({
          queryKey: ["claude-session-detail", sessionPath],
        });

        setIsSessionActive(true);
        if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
        activeTimerRef.current = setTimeout(() => {
          setIsSessionActive(false);
        }, ACTIVE_TIMEOUT_MS);
      }
    },
    [queryClient, sessionPath],
  );

  useEffect(() => {
    return () => {
      if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
    };
  }, []);

  useTauriEvent<SessionFileChangedPayload>(
    "session-file-changed",
    invalidateDetail,
  );

  const detailQuery = useQuery({
    ...watcherBackedQueryOptions,
    queryKey: ["claude-session-detail", sessionPath],
    queryFn: () => ClaudeSessionBridge.getSessionDetail(sessionPath),
    enabled: !!sessionPath,
  });
  const [isInitialRenderReady, setIsInitialRenderReady] = useState(false);
  const [isTopCollapsed, setIsTopCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasPreparedInitialRenderRef = useRef(false);
  const previousItemCountRef = useRef(0);

  const timelineItems = useMemo(
    () =>
      groupConsecutiveTools(
        buildFlatTimeline(detailQuery.data?.messages ?? []),
      ),
    [detailQuery.data?.messages],
  );

  const highlights = useMemo(() => {
    if (!detailQuery.data) return null;
    return buildSessionHighlights(detailQuery.data.messages ?? []);
  }, [detailQuery.data]);

  const replay = useReplay(timelineItems);

  // During replay, only show items up to visibleCount
  const displayItems = replay.isReplaying
    ? timelineItems.slice(0, replay.visibleCount)
    : timelineItems;

  const virtualizer = useVirtualizer({
    count: displayItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const item = displayItems[index];
      if (!item) return 90;
      switch (item.kind) {
        case "user":
          return 100;
        case "assistant":
          return 120;
        case "tool":
          // Inline tools (Edit/Write/Bash) are taller; compact tools (Read/Search) are tiny
          return item.toolName === "Edit" ||
            item.toolName === "Write" ||
            item.toolName === "Bash"
            ? 160
            : 24;
        case "thinking":
          return 24;
        case "tool-group":
          return 24;
        default:
          return 90;
      }
    },
    overscan: 4,
  });

  const handleScrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  const { showScrollToBottom, scrollToBottom } = useScrollToBottom({
    scrollRef,
    itemCount: timelineItems.length,
    onScrollToBottom: handleScrollToBottom,
    autoScrollOnInitialLoad: false,
  });

  /** Check if user is near bottom RIGHT NOW (not from stale state). */
  const checkIsNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance <= LIVE_FOLLOW_THRESHOLD_PX;
  }, []);

  const onBack = useCallback(() => {
    router.push("/sessions");
  }, [router]);

  // Auto-scroll during replay as items are revealed
  useEffect(() => {
    if (!replay.isReplaying || !replay.isPlaying) return;
    if (displayItems.length === 0) return;
    requestAnimationFrame(() => {
      virtualizer.scrollToIndex(displayItems.length - 1, { align: "end" });
    });
  }, [replay.isReplaying, replay.isPlaying, displayItems.length, virtualizer]);

  useEffect(() => {
    hasPreparedInitialRenderRef.current = false;
    previousItemCountRef.current = 0;
    setIsInitialRenderReady(false);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      setIsTopCollapsed(true);
      return;
    }

    const handleScroll = () => {
      const remaining =
        element.scrollHeight - element.clientHeight - element.scrollTop;
      setIsTopCollapsed((prev) => {
        if (prev) {
          return !(remaining <= TOP_PANEL_SHOW_THRESHOLD);
        }
        return remaining > TOP_PANEL_HIDE_THRESHOLD;
      });
    };

    handleScroll();
    element.addEventListener("scroll", handleScroll);
    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (detailQuery.isLoading && !hasPreparedInitialRenderRef.current) {
      setIsInitialRenderReady(false);
      return;
    }

    if (detailQuery.error) {
      setIsInitialRenderReady(true);
      return;
    }

    if (!detailQuery.data) {
      setIsInitialRenderReady(false);
      return;
    }

    if (timelineItems.length === 0) {
      hasPreparedInitialRenderRef.current = true;
      previousItemCountRef.current = 0;
      setIsInitialRenderReady(true);
      return;
    }

    const isFirstRender = !hasPreparedInitialRenderRef.current;
    const previousCount = previousItemCountRef.current;
    previousItemCountRef.current = timelineItems.length;

    if (!isFirstRender) {
      if (timelineItems.length > previousCount && checkIsNearBottom()) {
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(timelineItems.length - 1, {
            align: "end",
          });
        });
      }
      setIsInitialRenderReady(true);
      return;
    }

    let cancelled = false;
    const prepare = () => {
      if (cancelled) return;
      const element = scrollRef.current;
      if (!element) {
        requestAnimationFrame(prepare);
        return;
      }

      virtualizer.scrollToIndex(timelineItems.length - 1, {
        align: "end",
      });

      requestAnimationFrame(() => {
        if (cancelled) return;
        const remaining =
          element.scrollHeight - element.clientHeight - element.scrollTop;
        if (remaining > LIVE_FOLLOW_THRESHOLD_PX) {
          virtualizer.scrollToIndex(timelineItems.length - 1, {
            align: "end",
          });
        }
        requestAnimationFrame(() => {
          if (!cancelled) {
            hasPreparedInitialRenderRef.current = true;
            setIsInitialRenderReady(true);
          }
        });
      });
    };

    requestAnimationFrame(prepare);

    return () => {
      cancelled = true;
    };
  }, [
    detailQuery.isLoading,
    detailQuery.error,
    detailQuery.data,
    timelineItems.length,
    checkIsNearBottom,
    virtualizer,
  ]);

  return {
    sessionDetail: detailQuery.data ?? null,
    timelineItems: displayItems,
    totalMessageCount: detailQuery.data?.messages.length ?? 0,
    totalTurnCount: timelineItems.filter((item) => item.kind === "user").length,
    highlights,
    scrollRef,
    virtualizer,
    showScrollToBottom,
    scrollToBottom,
    isInitialRenderReady,
    isTopCollapsed,
    onBack,
    isSessionActive,
    isLoading: detailQuery.isLoading,
    error: detailQuery.error as Error | null,
    replay: {
      isReplaying: replay.isReplaying,
      isPlaying: replay.isPlaying,
      progress: replay.progress,
      speed: replay.speed,
      visibleCount: replay.visibleCount,
      totalCount: timelineItems.length,
      startReplay: replay.startReplay,
      stopReplay: replay.stopReplay,
      togglePlay: replay.togglePlay,
      setSpeed: replay.setSpeed,
      seek: replay.seek,
    },
  };
}
