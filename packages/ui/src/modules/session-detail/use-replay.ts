"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TimelineItem } from "./types";

export type ReplaySpeed = 1 | 2 | 4 | 8;

export interface UseReplayReturn {
  /** Whether replay mode is active */
  isReplaying: boolean;
  /** Whether replay is currently playing (vs paused) */
  isPlaying: boolean;
  /** Current visible item count (0 = all items visible, replay off) */
  visibleCount: number;
  /** Current playback speed */
  speed: ReplaySpeed;
  /** Start replay from beginning */
  startReplay: () => void;
  /** Stop replay and show all items */
  stopReplay: () => void;
  /** Toggle play/pause */
  togglePlay: () => void;
  /** Change playback speed */
  setSpeed: (speed: ReplaySpeed) => void;
  /** Seek to a specific position (0-1) */
  seek: (progress: number) => void;
  /** Progress value 0-1 */
  progress: number;
}

/** Maximum gap between items in ms (real time), to avoid long waits. */
const MAX_GAP_MS = 2000;
/** Minimum gap between items in ms. */
const MIN_GAP_MS = 150;

/**
 * Computes the delay before revealing the next item, based on timestamps.
 * Falls back to a fixed interval if timestamps are missing or identical.
 */
function getDelay(
  items: TimelineItem[],
  currentIndex: number,
  speed: ReplaySpeed,
): number {
  if (currentIndex <= 0 || currentIndex >= items.length) {
    return MIN_GAP_MS / speed;
  }

  const prev = items[currentIndex - 1];
  const curr = items[currentIndex];

  if (!prev.timestamp || !curr.timestamp) {
    return MIN_GAP_MS / speed;
  }

  const delta =
    new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();

  if (delta <= 0 || Number.isNaN(delta)) {
    return MIN_GAP_MS / speed;
  }

  const clamped = Math.min(Math.max(delta, MIN_GAP_MS), MAX_GAP_MS);
  return clamped / speed;
}

export function useReplay(items: TimelineItem[]): UseReplayReturn {
  const [isReplaying, setIsReplaying] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = useRef(items);
  const speedRef = useRef(speed);
  itemsRef.current = items;
  speedRef.current = speed;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Schedule the next tick
  const scheduleNext = useCallback(
    (currentCount: number) => {
      clearTimer();
      const allItems = itemsRef.current;
      if (currentCount >= allItems.length) {
        // Replay finished
        setIsPlaying(false);
        return;
      }
      const delay = getDelay(allItems, currentCount, speedRef.current);
      timerRef.current = setTimeout(() => {
        const nextCount = currentCount + 1;
        setVisibleCount(nextCount);
        scheduleNext(nextCount);
      }, delay);
    },
    [clearTimer],
  );

  const startReplay = useCallback(() => {
    clearTimer();
    setVisibleCount(1);
    setIsReplaying(true);
    setIsPlaying(true);
    // Schedule from index 1
    requestAnimationFrame(() => {
      scheduleNext(1);
    });
  }, [clearTimer, scheduleNext]);

  const stopReplay = useCallback(() => {
    clearTimer();
    setIsReplaying(false);
    setIsPlaying(false);
    setVisibleCount(0);
  }, [clearTimer]);

  const togglePlay = useCallback(() => {
    if (!isReplaying) return;
    if (isPlaying) {
      // Pause
      clearTimer();
      setIsPlaying(false);
    } else {
      // Resume (or restart if finished)
      setIsPlaying(true);
      const count = visibleCount >= itemsRef.current.length ? 1 : visibleCount;
      if (count === 1) setVisibleCount(1);
      scheduleNext(count);
    }
  }, [isReplaying, isPlaying, visibleCount, clearTimer, scheduleNext]);

  const seek = useCallback(
    (progress: number) => {
      const total = itemsRef.current.length;
      if (total === 0) return;
      const target = Math.max(1, Math.round(progress * total));
      clearTimer();
      setVisibleCount(target);
      if (isPlaying && target < total) {
        scheduleNext(target);
      } else if (target >= total) {
        setIsPlaying(false);
      }
    },
    [isPlaying, clearTimer, scheduleNext],
  );

  const progress =
    items.length === 0 ? 0 : isReplaying ? visibleCount / items.length : 1;

  // Cleanup on unmount
  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  return {
    isReplaying,
    isPlaying,
    visibleCount,
    speed,
    startReplay,
    stopReplay,
    togglePlay,
    setSpeed,
    seek,
    progress,
  };
}
