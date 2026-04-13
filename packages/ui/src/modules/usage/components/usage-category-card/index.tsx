"use client";

import { EChart } from "@/components/echarts";
import type { UsageBucketCardProps } from "./types";
import { useUsageBucketCard } from "./use-service";

/** Extract the model name from a label like "Sonnet · weekly" → "Sonnet".
 *  Falls back to the full label if no separator is present. */
function modelNameFromLabel(label: string): string {
  const [first] = label.split("·");
  return first.trim() || label;
}

export function UsageBucketCard({ label, bucket }: UsageBucketCardProps) {
  const { isUntouched, option, resetText } = useUsageBucketCard(bucket);

  // Reset slot priority:
  //   1. Concrete reset text from the backend → "Resets {text}"
  //   2. Untouched bucket (utilization null, no reset)
  //      → "You haven't used {model} yet"
  //   3. Otherwise → hide the line
  let footer: string | null = null;
  if (resetText) {
    footer = `Resets ${resetText}`;
  } else if (isUntouched) {
    footer = `You haven't used ${modelNameFromLabel(label)} yet`;
  }

  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex justify-center">
        <EChart
          option={option}
          className="aspect-square w-full max-w-[200px]"
        />
      </div>
      {footer && <p className="mt-2 text-xs text-muted-foreground">{footer}</p>}
    </div>
  );
}
