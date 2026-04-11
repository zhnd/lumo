"use client";

import { Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReplaySpeed } from "../../use-replay";

const SPEEDS: ReplaySpeed[] = [1, 2, 4, 8];

interface ReplayBarProps {
  isPlaying: boolean;
  progress: number;
  speed: ReplaySpeed;
  visibleCount: number;
  totalCount: number;
  onTogglePlay: () => void;
  onStop: () => void;
  onSpeedChange: (speed: ReplaySpeed) => void;
  onSeek: (progress: number) => void;
}

export function ReplayBar({
  isPlaying,
  progress,
  speed,
  visibleCount,
  totalCount,
  onTogglePlay,
  onStop,
  onSpeedChange,
  onSeek,
}: ReplayBarProps) {
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const p = Math.max(0, Math.min(1, x / rect.width));
    onSeek(p);
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-4 md:px-6">
      <div className="flex items-center gap-3 rounded-xl bg-card/90 px-4 py-2.5 shadow-lg ring-1 ring-border/50 backdrop-blur-sm">
        {/* Play / Pause */}
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onTogglePlay}
        >
          {isPlaying ? (
            <Pause className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
        </Button>

        {/* Progress bar */}
        <div
          className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-muted"
          onClick={handleProgressClick}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary/70 transition-[width] duration-150"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Counter */}
        <span className="min-w-[4rem] text-center font-mono text-[11px] text-muted-foreground">
          {visibleCount} / {totalCount}
        </span>

        {/* Speed */}
        <div className="flex items-center gap-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors",
                s === speed
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onSpeedChange(s)}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Stop */}
        <Button variant="ghost" size="icon" className="size-7" onClick={onStop}>
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
