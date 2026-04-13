"use client";

import { Clock, Crown, RefreshCw } from "lucide-react";
import { CardError } from "@/components/card-error";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  ApiBillingNotice,
  ExtraUsageCard,
  LoginPrompt,
  UsageBucketCard,
  UsageSkeleton,
} from "./components";
import { useService } from "./use-service";

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  MAX: {
    label: "Claude Max",
    color:
      "from-violet-500/15 to-fuchsia-500/15 dark:from-violet-500/25 dark:to-fuchsia-500/25",
  },
  PRO: {
    label: "Claude Pro",
    color:
      "from-sky-500/15 to-blue-500/15 dark:from-sky-500/25 dark:to-blue-500/25",
  },
  API: {
    label: "API Usage",
    color:
      "from-emerald-500/15 to-teal-500/15 dark:from-emerald-500/25 dark:to-teal-500/25",
  },
} as const;

function formatRelativeTime(fetchedAt: number, now: number): string {
  if (!fetchedAt) return "never";
  const diff = Math.floor((now - fetchedAt) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)} hr ago`;
}

export function Usage() {
  const { status, data, error, refresh, isRefreshing, now, fetchedAt } =
    useService();

  const usage = data?.usage;
  const subscriptionType = data?.subscriptionType;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Usage">
        {(status === "success" || status === "error") && (
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`mr-2 size-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        )}
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-muted/40">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          {status === "loading" && <UsageSkeleton />}

          {status === "login" && <LoginPrompt />}

          {status === "api_billing" && (
            <>
              {subscriptionType && (
                <div className="mb-6">
                  <SubscriptionBanner type={subscriptionType} />
                </div>
              )}
              <ApiBillingNotice />
            </>
          )}

          {status === "error" && (
            <CardError
              title="Usage"
              message={error ?? "Failed to fetch subscription usage"}
              onRetry={refresh}
            />
          )}

          {status === "success" && usage && (
            <div className="space-y-6">
              {/* Subscription tier banner */}
              {subscriptionType && (
                <SubscriptionBanner type={subscriptionType} />
              )}

              {/* Fixed 2-column grid on anything from small screens up so the
                  gauges always land in a 2x2 / 2x3 shape regardless of
                  window width. On very narrow windows (< 640px) fall back
                  to a single column so cards don't get squeezed. */}
              <div className="grid gap-4 sm:grid-cols-2">
                {usage.fiveHour && (
                  <UsageBucketCard
                    label="Current session"
                    bucket={usage.fiveHour}
                  />
                )}
                {usage.sevenDay && (
                  <UsageBucketCard
                    label="All models · weekly"
                    bucket={usage.sevenDay}
                  />
                )}
                {usage.sevenDayOpus && (
                  <UsageBucketCard
                    label="Opus · weekly"
                    bucket={usage.sevenDayOpus}
                  />
                )}
                {usage.sevenDaySonnet && (
                  <UsageBucketCard
                    label="Sonnet · weekly"
                    bucket={usage.sevenDaySonnet}
                  />
                )}
                {usage.extraUsage?.isEnabled && (
                  <ExtraUsageCard extra={usage.extraUsage} />
                )}
              </div>

              {/* Last updated + refresh policy */}
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3" />
                  <span>
                    Last updated: {formatRelativeTime(fetchedAt, now)}
                  </span>
                </div>
                <p>
                  Auto-refreshes every 30 min to avoid rate limits. Click
                  Refresh for latest data.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubscriptionBanner({ type }: { type: string }) {
  const config = TIER_CONFIG[type] ?? {
    label: type,
    color: "from-primary/10 to-primary/5",
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-xl bg-linear-to-r p-4 ${config.color}`}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background/80 shadow-sm">
        <Crown className="size-5 text-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{config.label}</p>
        <p className="text-xs text-muted-foreground">Active subscription</p>
      </div>
      <span className="ml-auto shrink-0 rounded-md bg-background/80 px-2.5 py-1 text-xs font-bold tracking-wider shadow-sm">
        {type}
      </span>
    </div>
  );
}
