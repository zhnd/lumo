"use client";

import { Clock, RefreshCw } from "lucide-react";
import { CardError } from "@/components/card-error";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ExtraUsageCard,
  LoginPrompt,
  UsageBucketCard,
  UsageSkeleton,
} from "./components";
import { useService } from "./use-service";

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
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          {status === "loading" && <UsageSkeleton />}

          {status === "login" && <LoginPrompt />}

          {status === "error" && (
            <CardError
              title="Usage"
              message={error ?? "Failed to fetch subscription usage"}
              onRetry={refresh}
            />
          )}

          {status === "success" && usage && (
            <div className="space-y-8">
              {/* Session limit (5-hour) */}
              {usage.fiveHour && (
                <div className="space-y-5">
                  <h2 className="text-base font-semibold">Session limit</h2>
                  <UsageBucketCard
                    label="Current session"
                    bucket={usage.fiveHour}
                  />
                </div>
              )}

              {/* Weekly limits */}
              {(usage.sevenDay ||
                usage.sevenDayOpus ||
                usage.sevenDaySonnet) && (
                <>
                  {usage.fiveHour && <Separator />}
                  <div className="space-y-5">
                    <h2 className="text-base font-semibold">Weekly limits</h2>
                    {usage.sevenDay && (
                      <UsageBucketCard
                        label="All models"
                        bucket={usage.sevenDay}
                      />
                    )}
                    {usage.sevenDay &&
                      (usage.sevenDayOpus || usage.sevenDaySonnet) && (
                        <Separator />
                      )}
                    {usage.sevenDayOpus && (
                      <UsageBucketCard
                        label="Opus"
                        bucket={usage.sevenDayOpus}
                      />
                    )}
                    {usage.sevenDayOpus && usage.sevenDaySonnet && (
                      <Separator />
                    )}
                    {usage.sevenDaySonnet && (
                      <UsageBucketCard
                        label="Sonnet"
                        bucket={usage.sevenDaySonnet}
                      />
                    )}
                  </div>
                </>
              )}

              {/* Extra usage */}
              {usage.extraUsage?.isEnabled && (
                <>
                  <Separator />
                  <div className="space-y-5">
                    <h2 className="text-base font-semibold">Extra usage</h2>
                    <ExtraUsageCard extra={usage.extraUsage} />
                  </div>
                </>
              )}

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
