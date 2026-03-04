"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CardErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function CardError({
  title,
  message = "Failed to load data",
  onRetry,
  className,
}: CardErrorProps) {
  return (
    <Card className={cn("gap-3 py-4", className)}>
      {title && (
        <CardHeader className="px-4">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex flex-col items-center justify-center gap-3 px-4 py-8">
        <AlertCircle className="size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 size-4" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
