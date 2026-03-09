"use client";

import { Bot, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMessageTime, getModelDisplayName } from "../../libs";
import type { TimelineAssistantItem } from "../../types";
import { MarkdownViewer } from "../viewers/markdown-viewer";

const COLLAPSE_THRESHOLD = 1200;
const PREVIEW_LENGTH = 600;

interface AssistantTextProps {
  item: TimelineAssistantItem;
}

export function AssistantText({ item }: AssistantTextProps) {
  const isLong = item.text.length > COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(!isLong);
  const displayModel = getModelDisplayName(item.model);
  const displayText = !expanded
    ? item.text.slice(0, PREVIEW_LENGTH)
    : item.text;

  return (
    <section className="px-4 py-2 md:px-6">
      <div className="border-l-2 border-primary/20 pl-4">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Bot className="size-3.5" />
          <span className="font-medium text-foreground">Claude</span>
          {displayModel && (
            <Badge
              variant="outline"
              className="h-5 rounded-full px-2 text-[10px]"
            >
              {displayModel}
            </Badge>
          )}
          <span className="ml-auto">{formatMessageTime(item.timestamp)}</span>
        </div>
        <div
          className={cn(
            "text-sm leading-relaxed break-words",
            !expanded && "max-h-[360px] overflow-hidden",
          )}
        >
          <MarkdownViewer content={displayText} />
        </div>
        {isLong && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-6 gap-1 px-2 text-[11px] text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="size-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" />
                Show more
              </>
            )}
          </Button>
        )}
      </div>
    </section>
  );
}
