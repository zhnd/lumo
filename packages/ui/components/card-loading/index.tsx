"use client";

import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CardLoadingProps {
  showTitle?: boolean;
  className?: string;
}

export function CardLoading({ showTitle, className }: CardLoadingProps) {
  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
      )}
      <CardContent className="flex items-center justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
