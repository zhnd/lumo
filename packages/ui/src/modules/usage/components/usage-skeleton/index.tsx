"use client";

import { Skeleton } from "@/components/ui/skeleton";

function GaugeCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <Skeleton className="h-4 w-28" />
      <div className="mt-2 flex justify-center">
        <div className="aspect-square w-full max-w-[200px]">
          <Skeleton className="h-full w-full rounded-full" />
        </div>
      </div>
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}

export function UsageSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <GaugeCardSkeleton />
      <GaugeCardSkeleton />
      <GaugeCardSkeleton />
      <GaugeCardSkeleton />
    </div>
  );
}
