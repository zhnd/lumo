"use client";

import { DollarSign, Zap, Clock, Boxes } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  TimeRangeTabs,
  CostChart,
  TokenChart,
  TokenBreakdown,
  ModelBreakdown,
  ProductivityMetrics,
} from "./components";
import { useService } from "./use-service";
import {
  formatCost,
  formatTokens,
  formatActiveTime,
  formatChange,
  formatAverage,
} from "./libs";

export function Overview() {
  const {
    timeRange,
    setTimeRange,
    stats,
    usageTrends,
    modelUsage,
    tokensByModel,
    productivity,
  } = useService();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Overview" daemonStatus="connected">
        <TimeRangeTabs value={timeRange} onChange={setTimeRange} />
      </PageHeader>

      <ScrollArea className="flex-1 bg-muted/40">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Cost"
              value={formatCost(stats.totalCost)}
              description={
                stats.costChangePercent !== undefined
                  ? `${formatChange(stats.costChangePercent)} vs last period`
                  : undefined
              }
              icon={<DollarSign className="size-4" />}
              color="emerald"
            />
            <StatCard
              title="Tokens"
              value={formatTokens(stats.totalTokens)}
              description={`${stats.cachePercentage}% from cache`}
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

          {/* Productivity Metrics */}
          <ProductivityMetrics data={productivity} />

          {/* Cost Row: Cost Trends + Model Breakdown */}
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <CostChart data={usageTrends} />
            </div>
            <div className="lg:col-span-2">
              <ModelBreakdown data={modelUsage} />
            </div>
          </div>

          {/* Token Chart */}
          <TokenChart data={usageTrends} />

          {/* Token Counter */}
          <TokenBreakdown data={tokensByModel} />
        </div>
      </ScrollArea>
    </div>
  );
}
