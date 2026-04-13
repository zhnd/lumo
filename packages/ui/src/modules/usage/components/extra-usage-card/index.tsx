"use client";

import { EChart } from "@/components/echarts";
import type { ExtraUsageCardProps } from "./types";
import { useExtraUsageCard } from "./use-service";

export function ExtraUsageCard({ extra }: ExtraUsageCardProps) {
  const { option, resetText } = useExtraUsageCard(extra);

  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <p className="text-sm font-medium">Extra usage</p>
      <div className="mt-2 flex justify-center">
        <EChart
          option={option}
          className="aspect-square w-full max-w-[200px]"
        />
      </div>
      {resetText && (
        <p className="mt-2 text-xs text-muted-foreground">Resets {resetText}</p>
      )}
    </div>
  );
}
