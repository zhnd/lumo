import { useRef, useState, useEffect, useCallback } from "react";

const THRESHOLD = 200;

interface UseScrollToBottomOptions {
  /** The scroll container ref */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Trigger auto-scroll to bottom when this value becomes > 0 */
  itemCount: number;
  /** Function to call when scrolling to bottom */
  onScrollToBottom: () => void;
  /** Whether to auto-scroll once on initial load */
  autoScrollOnInitialLoad?: boolean;
}

interface UseScrollToBottomReturn {
  showScrollToBottom: boolean;
  scrollToBottom: () => void;
}

export function useScrollToBottom({
  scrollRef,
  itemCount,
  onScrollToBottom,
  autoScrollOnInitialLoad = true,
}: UseScrollToBottomOptions): UseScrollToBottomReturn {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const hasAutoScrolled = useRef(false);

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    if (!autoScrollOnInitialLoad) return;
    if (itemCount > 0 && !hasAutoScrolled.current) {
      hasAutoScrolled.current = true;
      requestAnimationFrame(() => {
        onScrollToBottom();
      });
    }
  }, [itemCount, onScrollToBottom, autoScrollOnInitialLoad]);

  // Track scroll position — depend on itemCount so listener attaches after content renders
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollToBottom(distanceFromBottom > THRESHOLD);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollRef, itemCount]);

  const scrollToBottom = useCallback(() => {
    onScrollToBottom();
  }, [onScrollToBottom]);

  return {
    showScrollToBottom,
    scrollToBottom,
  };
}
