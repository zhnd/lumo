"use client";

import { memo } from "react";
import type { TimelineItem as TimelineItemType } from "../../types";
import { AssistantText } from "../assistant-text";
import { ThinkingBlock } from "../thinking-block";
import { ToolGroup } from "../tool-group";
import { ToolItem } from "../tool-item";
import { UserBubble } from "../user-bubble";

interface TimelineItemProps {
  item: TimelineItemType;
}

export const TimelineItem = memo(function TimelineItem({
  item,
}: TimelineItemProps) {
  switch (item.kind) {
    case "user":
      return <UserBubble item={item} />;
    case "assistant":
      return <AssistantText item={item} />;
    case "thinking":
      return <ThinkingBlock item={item} />;
    case "tool":
      return <ToolItem item={item} />;
    case "tool-group":
      return <ToolGroup item={item} />;
    default:
      return null;
  }
});
