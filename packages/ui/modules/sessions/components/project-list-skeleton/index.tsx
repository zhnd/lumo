import { Skeleton } from "@/components/ui/skeleton";

export function ProjectListSkeleton() {
  return (
    <div className="sticky top-0 z-20 w-full border-b bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static md:z-auto md:w-72 md:border-r md:border-b-0 md:bg-muted/20 md:backdrop-blur-0">
      <div className="flex gap-2 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>

      <div className="hidden md:block">
        <Skeleton className="h-9 w-full rounded-md" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-md border p-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
