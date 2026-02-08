"use client";

import { useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { CardError } from "@/components/card-error";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WrappedPeriod } from "@/src/generated/typeshare-types";
import {
  HeroStat,
  TopModel,
  FavoriteTool,
  CostCard,
  CodingStreak,
  PeakHour,
  TokenBreakdownChart,
  ShareButton,
} from "./components";
import { useService } from "./use-service";

export function Wrapped() {
  const {
    period,
    setPeriod,
    data,
    hasMeaningfulData,
    isLoading,
    error,
    refetch,
  } = useService();
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Wrapped">
        <div className="flex items-center gap-2">
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as WrappedPeriod)}
          >
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={WrappedPeriod.Today}>Today</SelectItem>
              <SelectItem value={WrappedPeriod.Week}>This Week</SelectItem>
              <SelectItem value={WrappedPeriod.Month}>This Month</SelectItem>
              <SelectItem value={WrappedPeriod.All}>All Time</SelectItem>
            </SelectContent>
          </Select>
          {data && hasMeaningfulData && <ShareButton targetRef={cardRef} />}
        </div>
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-muted/40">
        <div className="flex flex-col items-center py-8 px-6">
          {isLoading && (
            <div className="w-full max-w-md rounded-xl border border-border bg-card py-6 animate-pulse">
              <div className="px-6 pb-2">
                <Skeleton className="h-3 w-40 mx-auto" />
              </div>
              <div className="px-6 space-y-1">
                {/* Hero stat skeleton */}
                <div className="flex flex-col items-center gap-2 py-4">
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-12 w-28" />
                  <Skeleton className="h-4 w-36" />
                </div>

                <Separator />

                {/* Stat rows skeleton */}
                <div className="space-y-4 py-4">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="size-10 rounded-xl" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Token breakdown skeleton */}
                <div className="pt-4 space-y-2">
                  <Skeleton className="h-3 w-28" />
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton
                        className="h-6 flex-1"
                        style={{ width: `${80 - i * 15}%` }}
                      />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {error && (
            <CardError
              title="Wrapped"
              message="Failed to load data"
              onRetry={() => refetch()}
            />
          )}
          {data && hasMeaningfulData && (
            <div ref={cardRef} className="bg-muted p-10">
              <div className="w-full max-w-md rounded-xl border border-border bg-card py-6">
                <div className="px-6 pb-2">
                  <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
                    Your Claude Code Wrapped
                  </p>
                </div>
                <div className="px-6 space-y-1">
                  <HeroStat data={data} />

                  <Separator />

                  <div className="space-y-4 py-4">
                    <TopModel data={data} />
                    <FavoriteTool data={data} />
                    <CostCard data={data} />
                  </div>

                  <Separator />

                  <div className="pt-4">
                    <TokenBreakdownChart data={data} />
                  </div>

                  <Separator />

                  <div className="space-y-4 py-4">
                    <CodingStreak data={data} />
                    <PeakHour data={data} />
                  </div>
                </div>
              </div>
            </div>
          )}
          {data && !hasMeaningfulData && (
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
              <p className="text-center text-sm font-medium">No wrapped data yet</p>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Run more Claude Code sessions in this period, then come back to
                see your summary.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
