"use client";

import { KeyRound, RefreshCw, X, Check, Trash2 } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { useService } from "./use-service";

function StatusDot({ status }: { status: string }) {
  const color =
    status === "rejected"
      ? "bg-destructive"
      : status === "allowed_warning"
        ? "bg-yellow-500"
        : "bg-emerald-500";

  return (
    <span className={`inline-block size-2 rounded-full ${color}`} />
  );
}

function formatResetTime(resetsAt: string | undefined): string | null {
  if (!resetsAt) return null;
  try {
    const resetDate = new Date(resetsAt);
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();
    if (diffMs <= 0) return "now";
    const diffMin = Math.ceil(diffMs / 60_000);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    const remainingMin = diffMin % 60;
    return remainingMin > 0 ? `${diffHours}h ${remainingMin}m` : `${diffHours}h`;
  } catch {
    return null;
  }
}

function getHeaderValue(
  headers: { name: string; value: string }[],
  key: string,
): string | undefined {
  return headers.find((h) => h.name === key)?.value;
}

function formatTokenCount(value: string | undefined): string {
  if (!value) return "?";
  const num = parseInt(value, 10);
  if (isNaN(num)) return value;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toString();
}

export function UsageLimits() {
  const {
    hasApiKey,
    isLoading,
    usageLimits,
    isEditing,
    apiKeyInput,
    isFetching,
    setApiKeyInput,
    handleStartEditing,
    handleCancelEditing,
    handleSaveApiKey,
    handleRefresh,
    handleDeleteApiKey,
  } = useService();

  if (isLoading) return null;

  // API Key input mode
  if (isEditing) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-1 px-2 py-1">
            <Input
              type="password"
              placeholder="sk-ant-..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveApiKey();
                if (e.key === "Escape") handleCancelEditing();
              }}
              className="h-7 text-xs"
              autoFocus
            />
            <button
              onClick={handleSaveApiKey}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <Check className="size-3.5" />
            </button>
            <button
              onClick={handleCancelEditing}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // No API key configured
  if (!hasApiKey) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Set Anthropic API Key"
            className="h-9"
            onClick={handleStartEditing}
          >
            <KeyRound className="size-4" />
            <span>Set API Key</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Has API key — show usage limits
  const remaining = usageLimits
    ? getHeaderValue(usageLimits.headers, "anthropic-ratelimit-tokens-remaining")
    : undefined;
  const limit = usageLimits
    ? getHeaderValue(usageLimits.headers, "anthropic-ratelimit-tokens-limit")
    : undefined;
  const resetTime = usageLimits
    ? formatResetTime(usageLimits.resetsAt)
    : null;

  const tooltipText = usageLimits
    ? `Tokens: ${formatTokenCount(remaining)} / ${formatTokenCount(limit)}${resetTime ? ` · Resets in ${resetTime}` : ""}`
    : "Loading usage limits...";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip={tooltipText} className="h-9" asChild>
          <div className="flex items-center">
            {usageLimits ? (
              <>
                <StatusDot status={usageLimits.status} />
                <span className="truncate text-xs">
                  {formatTokenCount(remaining)} / {formatTokenCount(limit)}
                  {resetTime && (
                    <span className="text-muted-foreground"> · {resetTime}</span>
                  )}
                </span>
              </>
            ) : (
              <>
                <RefreshCw className="size-4 animate-spin" />
                <span className="text-xs">Loading...</span>
              </>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefresh();
                }}
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                title="Refresh"
              >
                <RefreshCw
                  className={`size-3 ${isFetching ? "animate-spin" : ""}`}
                />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteApiKey();
                }}
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                title="Remove API Key"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
