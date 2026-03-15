"use client";

import { useRef } from "react";
import { CardError } from "@/components/card-error";
import { PageHeader } from "@/components/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { WrappedPeriod } from "@/generated/typeshare-types";
import {
  CodeOutput,
  CodingPersona,
  CodingStreak,
  CostCard,
  FavoriteTool,
  FunFacts,
  HeroStat,
  PeakHour,
  ShareButton,
  TopModel,
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
                <div className="flex flex-col items-center gap-2 py-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-12 w-28 mt-2" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <Separator />
                <div className="space-y-4 py-4">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="size-10 rounded-xl" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-5 w-32" />
                      </div>
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
            <div ref={cardRef} className="w-full max-w-md bg-muted p-4 sm:p-10">
              <div className="w-full rounded-xl border border-border bg-card py-6">
                <div className="px-6 pb-2">
                  <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
                    Your Claude Code Wrapped
                  </p>
                </div>
                <div className="px-6 space-y-1">
                  {/* Persona + Hero */}
                  <CodingPersona data={data} />
                  <HeroStat data={data} />

                  <Separator />

                  {/* Output */}
                  <div className="py-4">
                    <CodeOutput data={data} />
                  </div>

                  <Separator />

                  {/* Cost */}
                  <div className="space-y-4 py-4">
                    <CostCard data={data} />
                  </div>

                  <Separator />

                  {/* Preferences */}
                  <div className="space-y-4 py-4">
                    <TopModel data={data} />
                    <FavoriteTool data={data} />
                  </div>

                  <Separator />

                  {/* Habits */}
                  <div className="space-y-4 py-4">
                    <CodingStreak data={data} />
                    <PeakHour data={data} />
                  </div>

                  <Separator />

                  {/* Fun facts */}
                  <div className="py-4">
                    <FunFacts data={data} />
                  </div>
                </div>

                {/* Branding footer */}
                <div className="px-6 pt-2">
                  <p className="text-center text-[10px] tracking-wide text-muted-foreground/60">
                    lumo &middot; your claude code companion
                  </p>
                </div>
              </div>
            </div>
          )}
          {data && !hasMeaningfulData && (
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
              <p className="text-center text-sm font-medium">
                No wrapped data yet
              </p>
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
