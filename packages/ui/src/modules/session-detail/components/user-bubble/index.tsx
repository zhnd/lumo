"use client";

import { Clock3, User } from "lucide-react";
import { formatMessageTime } from "../../libs";
import type { TimelineUserItem } from "../../types";

interface UserBubbleProps {
  item: TimelineUserItem;
}

export function UserBubble({ item }: UserBubbleProps) {
  return (
    <section className="flex justify-end px-4 py-2 md:px-6">
      <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-accent px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User className="size-3.5" />
            You
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3" />
            {formatMessageTime(item.timestamp)}
          </span>
        </div>
        <div className="max-h-[220px] overflow-auto pr-2 text-sm leading-6">
          <p className="whitespace-pre-wrap break-words">{item.text}</p>
        </div>
        {item.commandOutput && (
          <div className="mt-2 rounded-md bg-muted/50 px-3 py-2">
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-muted-foreground">
              {item.commandOutput}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}
