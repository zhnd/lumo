"use client";

import { Flame } from "lucide-react";
import type { WrappedData } from "@/generated/typeshare-types";

export function CodingStreak({ data }: { data: WrappedData }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center justify-center size-10 rounded-xl bg-orange-500/10">
        <Flame className="size-5 text-orange-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Longest streak</p>
        <p className="text-lg font-semibold">
          {data.longestStreakDays} day{data.longestStreakDays !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
