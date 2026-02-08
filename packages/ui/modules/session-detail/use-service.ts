"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter } from "next/navigation";
import { ClaudeSessionBridge } from "@/src/bridges/claude-session-bridge";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { buildSessionHighlights, filterSessionMessages, isRenderableMessage } from "./libs";
import type { UseServiceReturn } from "./types";

const TOP_PANEL_SHOW_THRESHOLD = 24;
const TOP_PANEL_HIDE_THRESHOLD = 260;

export function useService(sessionPath: string): UseServiceReturn {
  const router = useRouter();
  const detailQuery = useQuery({
    queryKey: ["claude-session-detail", sessionPath],
    queryFn: () => ClaudeSessionBridge.getSessionDetail(sessionPath),
    enabled: !!sessionPath,
  });
  const [showEssentialOnly, setShowEssentialOnly] = useState(true);
  const [isInitialRenderReady, setIsInitialRenderReady] = useState(false);
  const [isTopCollapsed, setIsTopCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allRenderableMessages = useMemo(
    () => (detailQuery.data?.messages ?? []).filter(isRenderableMessage),
    [detailQuery.data?.messages],
  );

  const messages = useMemo(
    () => filterSessionMessages(detailQuery.data?.messages ?? [], showEssentialOnly),
    [detailQuery.data?.messages, showEssentialOnly],
  );

  const highlights = useMemo(() => {
    if (!detailQuery.data) return null;
    return buildSessionHighlights(allRenderableMessages);
  }, [detailQuery.data, allRenderableMessages]);

  const toggleEssentialOnly = useCallback(() => {
    setShowEssentialOnly((v) => !v);
  }, []);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 120,
    overscan: 10,
  });

  const handleScrollToBottom = useCallback(() => {
    if (messages.length === 0) return;
    virtualizer.scrollToIndex(messages.length - 1, {
      align: "end",
      behavior: "smooth",
    });
  }, [virtualizer, messages.length]);

  const { showScrollToBottom, scrollToBottom } = useScrollToBottom({
    scrollRef,
    itemCount: messages.length,
    onScrollToBottom: handleScrollToBottom,
    autoScrollOnInitialLoad: false,
  });

  const onBack = useCallback(() => {
    router.push("/sessions");
  }, [router]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      setIsTopCollapsed(true);
      return;
    }

    const handleScroll = () => {
      const remaining = element.scrollHeight - element.clientHeight - element.scrollTop;
      setIsTopCollapsed((prev) => {
        // Expand only when near bottom; once expanded, keep it until user scrolls up far enough.
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
  }, [messages.length, detailQuery.isLoading]);

  useEffect(() => {
    if (detailQuery.isLoading) {
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

    if (messages.length === 0) {
      setIsInitialRenderReady(true);
      return;
    }

    let cancelled = false;
    setIsInitialRenderReady(false);

    const prepare = () => {
      if (cancelled) return;
      const element = scrollRef.current;
      if (!element) {
        requestAnimationFrame(prepare);
        return;
      }

      virtualizer.scrollToIndex(messages.length - 1, {
        align: "end",
      });

      requestAnimationFrame(() => {
        if (cancelled) return;
        const remaining = element.scrollHeight - element.clientHeight - element.scrollTop;
        if (remaining > 2) {
          virtualizer.scrollToIndex(messages.length - 1, {
            align: "end",
          });
        }
        requestAnimationFrame(() => {
          if (!cancelled) {
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
    messages.length,
    scrollRef,
    virtualizer,
  ]);

  return {
    sessionDetail: detailQuery.data ?? null,
    messages,
    totalMessageCount: allRenderableMessages.length,
    visibleMessageCount: messages.length,
    showEssentialOnly,
    toggleEssentialOnly,
    highlights,
    scrollRef,
    virtualizer,
    showScrollToBottom,
    scrollToBottom,
    isInitialRenderReady,
    isTopCollapsed,
    onBack,
    isLoading: detailQuery.isLoading,
    error: detailQuery.error as Error | null,
  };
}
