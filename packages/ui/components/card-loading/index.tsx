"use client";

import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CardLoadingProps {
  showTitle?: boolean;
  className?: string;
}

export function CardLoading({ showTitle, className }: CardLoadingProps) {
  return (
    <Card className={cn("gap-3 py-4", className)}>
      {showTitle && (
        <CardHeader className="px-4">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
      )}
      <CardContent className="flex items-center justify-center px-4 py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
