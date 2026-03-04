"use client";

import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScrollToBottomButtonProps {
  visible: boolean;
  onClick: () => void;
  className?: string;
}

export function ScrollToBottomButton({
  visible,
  onClick,
  className,
}: ScrollToBottomButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "absolute bottom-8 left-1/2 z-10 size-8 -translate-x-1/2 rounded-full shadow-md transition-opacity",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
        className,
      )}
      onClick={onClick}
    >
      <ArrowDown className="size-4" />
    </Button>
  );
}
