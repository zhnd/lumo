"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClaudeSessionBridge } from "@/bridges/claude-session-bridge";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { useTauriEvent } from "@/hooks/use-tauri-event";
import { watcherBackedQueryOptions } from "@/lib/query-options";
import { buildFlatTimeline, buildSessionHighlights } from "./libs";
import type { UseServiceReturn } from "./types";

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
    () => buildFlatTimeline(detailQuery.data?.messages ?? []),
    [detailQuery.data?.messages],
  );

  const highlights = useMemo(() => {
    if (!detailQuery.data) return null;
    return buildSessionHighlights(detailQuery.data.messages ?? []);
  }, [detailQuery.data]);

  const virtualizer = useVirtualizer({
    count: timelineItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const item = timelineItems[index];
      if (!item) return 90;
      switch (item.kind) {
        case "user":
          return 100;
        case "assistant":
          return 120;
        case "tool":
          return 52;
        case "thinking":
          return 44;
        default:
          return 90;
      }
    },
    overscan: 4,
  });

  const handleScrollToBottom = useCallback(() => {
    if (timelineItems.length === 0) return;
    virtualizer.scrollToIndex(timelineItems.length - 1, {
      align: "end",
      behavior: "smooth",
    });
  }, [virtualizer, timelineItems.length]);

  const { showScrollToBottom, isNearBottom, scrollToBottom } =
    useScrollToBottom({
      scrollRef,
      itemCount: timelineItems.length,
      onScrollToBottom: handleScrollToBottom,
      autoScrollOnInitialLoad: false,
    });

  const onBack = useCallback(() => {
    router.push("/sessions");
  }, [router]);

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
      if (timelineItems.length > previousCount && isNearBottom) {
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
    isNearBottom,
    virtualizer,
  ]);

  return {
    sessionDetail: detailQuery.data ?? null,
    timelineItems,
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
  };
}
