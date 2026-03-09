"use client";

import { ArrowRightLeft, Clock, RefreshCw } from "lucide-react";
import { CardError } from "@/components/card-error";
import { PageHeader } from "@/components/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { SubscriptionUsageCategory } from "@/generated/typeshare-types";
import {
  LoginPrompt,
  NoSubscriptionPrompt,
  UsageCategoryCard,
  UsageSkeleton,
} from "./components";
import { useService } from "./use-service";

function formatFetchedAt(ts: number, now: number): string {
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)} hr ago`;
}

interface SectionProps {
  title: string;
  categories: SubscriptionUsageCategory[];
}

function Section({ title, categories }: SectionProps) {
  if (categories.length === 0) return null;
  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {categories.map((cat, i) => (
        <div key={cat.name}>
          <UsageCategoryCard category={cat} />
          {i < categories.length - 1 && <Separator className="mt-5" />}
        </div>
      ))}
    </div>
  );
}

export function Usage() {
  const {
    status,
    data,
    error,
    refresh,
    isRefreshing,
    onLogin,
    isLoggingIn,
    onSwitchAccount,
    now,
  } = useService();

  const categories = data?.usage?.categories ?? [];
  const sessionCats = categories.filter((c) => c.name === "current_session");
  const weeklyCats = categories.filter(
    (c) => c.name === "all_models" || c.name === "sonnet_only",
  );
  const extraCats = categories.filter((c) => c.name === "extra_usage");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Usage">
        {(status === "success" ||
          status === "no-subscription" ||
          status === "parse-error") && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowRightLeft className="mr-2 size-4" />
                Switch account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Switch account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will sign you out of the current Claude account. You will
                  need to sign in again to view usage data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onSwitchAccount}>
                  Switch account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {(status === "success" ||
          status === "error" ||
          status === "parse-error") && (
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

          {status === "login" && (
            <LoginPrompt onLogin={onLogin} isLoading={isLoggingIn} />
          )}

          {status === "no-subscription" && (
            <NoSubscriptionPrompt onSwitchAccount={onSwitchAccount} />
          )}

          {status === "parse-error" && (
            <CardError
              title="Usage"
              message="Could not parse usage data from Claude. The page layout may have changed or failed to load completely."
              onRetry={refresh}
            />
          )}

          {status === "error" && (
            <CardError
              title="Usage"
              message={error ?? "Failed to fetch subscription usage"}
              onRetry={refresh}
            />
          )}

          {status === "success" && data?.usage && (
            <div className="space-y-8">
              <Section title="Plan usage limits" categories={sessionCats} />

              {weeklyCats.length > 0 && sessionCats.length > 0 && <Separator />}

              <Section title="Weekly limits" categories={weeklyCats} />

              {extraCats.length > 0 &&
                (weeklyCats.length > 0 || sessionCats.length > 0) && (
                  <Separator />
                )}

              <Section title="Extra usage" categories={extraCats} />

              {/* Last updated */}
              {data.usage.fetchedAt > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  <span>
                    Last updated: {formatFetchedAt(data.usage.fetchedAt, now)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
