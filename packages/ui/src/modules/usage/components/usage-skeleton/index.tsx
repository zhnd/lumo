"use client";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function CategorySkeleton({ hasSubtext = true }: { hasSubtext?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          {hasSubtext && <Skeleton className="h-3 w-24" />}
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

export function UsageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Plan usage limits */}
      <div className="space-y-5">
        <Skeleton className="h-5 w-36" />
        <CategorySkeleton />
      </div>

      <Separator />

      {/* Weekly limits */}
      <div className="space-y-5">
        <Skeleton className="h-5 w-28" />
        <CategorySkeleton />
        <Separator />
        <CategorySkeleton />
      </div>

      <Separator />

      {/* Extra usage */}
      <div className="space-y-5">
        <Skeleton className="h-5 w-24" />
        <CategorySkeleton />
      </div>
    </div>
  );
}
