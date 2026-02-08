import { FilePen, FilePlus, Wrench } from "lucide-react";
import type { ClaudeToolUse } from "../../../types";
import { formatToolInput } from "../libs";
import { ToolResultDiff } from "../tool-result-diff";

const ICONS: Record<string, React.FC<{ className?: string }>> = {
  Edit: FilePen,
  Write: FilePlus,
};

interface ToolEditWriteProps {
  tool: ClaudeToolUse;
}

export function ToolEditWrite({ tool }: ToolEditWriteProps) {
  const Icon = ICONS[tool.name] ?? Wrench;
  const summary = tool.input ? formatToolInput(tool.input) : null;

  return (
    <div className="overflow-hidden rounded-lg border bg-muted/30">
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="font-medium">{tool.name}</span>
        {summary && (
          <code className="truncate text-muted-foreground">{summary}</code>
        )}
      </div>
      {tool.input && (
        <ToolResultDiff toolName={tool.name} input={tool.input} />
      )}
    </div>
  );
}
