"use client";

import { Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card className={className}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex flex-col items-center justify-center gap-2 py-8">
        {icon ?? <Inbox className="size-8 text-muted-foreground" />}
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
