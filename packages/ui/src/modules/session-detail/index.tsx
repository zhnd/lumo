"use client";

import { CardError } from "@/components/card-error";
import { ScrollToBottomButton } from "@/components/scroll-to-bottom";
import { cn } from "@/lib/utils";
import {
  SessionDetailSkeleton,
  SessionHeader,
  SessionHighlights,
  TimelineItem,
} from "./components";
import type { SessionDetailModuleProps } from "./types";
import { useService } from "./use-service";

export function SessionDetail({ sessionPath }: SessionDetailModuleProps) {
  const {
    sessionDetail,
    timelineItems,
    totalMessageCount,
    totalTurnCount,
    highlights,
    scrollRef,
    virtualizer,
    showScrollToBottom,
    scrollToBottom,
    isInitialRenderReady,
    isTopCollapsed,
    isSessionActive,
    onBack,
    isLoading,
    error,
  } = useService(sessionPath);

  if (error && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <CardError
          message={error?.message || "Failed to load session"}
          onRetry={onBack}
        />
      </div>
    );
  }

  if (!sessionDetail) {
    return <SessionDetailSkeleton />;
  }

  const { session } = sessionDetail;

  return (
    <div className="relative h-full">
      <div
        className={cn(
          "flex h-full flex-col",
          !isInitialRenderReady && "invisible",
        )}
      >
        <div className="z-20">
          <SessionHeader
            session={session}
            messageCount={totalMessageCount}
            turnCount={totalTurnCount}
            stats={sessionDetail.stats}
            collapsed={isTopCollapsed}
            onBack={onBack}
          />
          {!isTopCollapsed && highlights && (
            <SessionHighlights highlights={highlights} />
          )}
        </div>

        {timelineItems.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            No visible conversation in this session
          </div>
        ) : (
          <div className="relative flex-1 overflow-hidden">
            <div ref={scrollRef} className="h-full overflow-auto pb-6">
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => (
                  <div
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <TimelineItem item={timelineItems[virtualItem.index]} />
                  </div>
                ))}
              </div>
            </div>

            {isSessionActive && (
              <div className="flex items-center gap-1.5 px-4 py-3">
                <span className="inline-flex gap-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                </span>
                <span className="text-xs text-muted-foreground">
                  Session active
                </span>
              </div>
            )}

            <ScrollToBottomButton
              visible={showScrollToBottom}
              onClick={scrollToBottom}
            />
          </div>
        )}
      </div>

      {!isInitialRenderReady && (
        <div className="absolute inset-0 z-30">
          <SessionDetailSkeleton />
        </div>
      )}
    </div>
  );
}
