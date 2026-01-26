"use client";

import { DollarSign, Zap, Clock, Boxes } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { CardLoading } from "@/components/card-loading";
import { CardError } from "@/components/card-error";
import { useService } from "./use-service";
import type { StatCardsProps } from "./types";
import {
  formatCost,
  formatTokens,
  formatActiveTime,
  formatChange,
  formatAverage,
} from "../../libs";

export function StatCards({ timeRange }: StatCardsProps) {
  const { stats, isLoading, error, refetch } = useService(timeRange);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardLoading key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CardError
          message="Failed to load statistics"
          onRetry={() => refetch()}
          className="col-span-full"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Cost"
        value={formatCost(stats.totalCost)}
        description={
          stats.costChangePercent !== 0
            ? `${formatChange(stats.costChangePercent)} vs last period`
            : undefined
        }
        icon={<DollarSign className="size-4" />}
        color="emerald"
      />
      <StatCard
        title="Tokens"
        value={formatTokens(stats.totalTokens)}
        description={`${stats.cachePercentage.toFixed(0)}% from cache`}
        icon={<Zap className="size-4" />}
        color="blue"
      />
      <StatCard
        title="Active Time"
        value={formatActiveTime(stats.activeTimeSeconds)}
        description={`~${formatAverage(stats.activeTimeSeconds, stats.totalSessions)}/session`}
        icon={<Clock className="size-4" />}
        color="violet"
      />
      <StatCard
        title="Sessions"
        value={stats.totalSessions.toString()}
        description={`+${stats.todaySessions} today`}
        icon={<Boxes className="size-4" />}
        color="amber"
      />
    </div>
  );
}
