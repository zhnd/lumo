import { Skeleton } from "@/components/ui/skeleton";

export function SessionDetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="bg-muted/10">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-8 rounded-md" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Meta bar */}
        <div className="flex items-center gap-4 px-4 pb-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-18" />
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 space-y-4 overflow-hidden p-4">
        {/* User message */}
        <MessageSkeleton align="right" lines={2} />
        {/* Assistant message */}
        <MessageSkeleton align="left" lines={4} />
        {/* Tool use */}
        <ToolUseSkeleton />
        {/* Assistant message */}
        <MessageSkeleton align="left" lines={3} />
        {/* User message */}
        <MessageSkeleton align="right" lines={1} />
        {/* Assistant message */}
        <MessageSkeleton align="left" lines={5} />
        {/* Tool use */}
        <ToolUseSkeleton />
      </div>
    </div>
  );
}

function MessageSkeleton({
  align,
  lines,
}: {
  align: "left" | "right";
  lines: number;
}) {
  const widths = ["w-full", "w-4/5", "w-3/5", "w-5/6", "w-2/3"];

  return (
    <div
      className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`space-y-1.5 ${align === "right" ? "w-2/3" : "w-3/4"}`}
      >
        {/* Role + avatar */}
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="h-3 w-14" />
        </div>
        {/* Text lines */}
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-3.5 ${widths[i % widths.length]}`}
          />
        ))}
      </div>
    </div>
  );
}

function ToolUseSkeleton() {
  return (
    <div className="ml-7 space-y-2">
      <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-1.5">
        <Skeleton className="size-3.5" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-1.5">
        <Skeleton className="size-3.5" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  );
}
