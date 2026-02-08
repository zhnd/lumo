"use client";

import { CardError } from "@/components/card-error";
import { ScrollToBottomButton } from "@/components/scroll-to-bottom";
import { cn } from "@/lib/utils";
import {
  MessageItem,
  SessionHeader,
  SessionDetailSkeleton,
  SessionHighlights,
  SessionViewControls,
} from "./components";
import { useService } from "./use-service";
import type { SessionDetailModuleProps } from "./types";

export function SessionDetail({ sessionPath }: SessionDetailModuleProps) {
  const {
    sessionDetail,
    messages,
    totalMessageCount,
    visibleMessageCount,
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
      <div className={cn("flex h-full flex-col", !isInitialRenderReady && "invisible")}>
        <div className="z-20">
          <SessionHeader
            session={session}
            messageCount={totalMessageCount}
            stats={sessionDetail.stats}
            collapsed={isTopCollapsed}
            onBack={onBack}
          />
          {!isTopCollapsed && highlights && <SessionHighlights highlights={highlights} />}
          {!isTopCollapsed && (
            <SessionViewControls
              showEssentialOnly={showEssentialOnly}
              visibleCount={visibleMessageCount}
              totalCount={totalMessageCount}
              onToggleEssentialOnly={toggleEssentialOnly}
            />
          )}
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            No messages in this session
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
                    <MessageItem message={messages[virtualItem.index]} />
                  </div>
                ))}
              </div>
            </div>

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
