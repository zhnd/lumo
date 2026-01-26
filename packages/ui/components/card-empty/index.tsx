"use client";

import { Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CardEmptyProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function CardEmpty({
  title,
  message = "No data available",
  icon,
  className,
}: CardEmptyProps) {
  return (
    <Card className={cn("gap-3 py-4", className)}>
      {title && (
        <CardHeader className="px-4">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex flex-col items-center justify-center gap-2 px-4 py-8">
        {icon ?? <Inbox className="size-8 text-muted-foreground" />}
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
