"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import {
  TimeRangeTabs,
  StatCards,
  CostChart,
  TokenChart,
  TokenBreakdown,
  ModelBreakdown,
  ProductivityMetrics,
} from "./components";
import { useService } from "./use-service";

export function Overview() {
  const { timeRange, setTimeRange } = useService();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Overview" daemonStatus="connected">
        <TimeRangeTabs value={timeRange} onChange={setTimeRange} />
      </PageHeader>

      <ScrollArea className="flex-1 bg-muted/40">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          {/* Stats Cards */}
          <StatCards timeRange={timeRange} />

          {/* Productivity Metrics */}
          <ProductivityMetrics timeRange={timeRange} />

          {/* Cost Row: Cost Trends + Model Breakdown */}
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <CostChart timeRange={timeRange} />
            </div>
            <div className="lg:col-span-2">
              <ModelBreakdown timeRange={timeRange} />
            </div>
          </div>

          {/* Token Chart */}
          <TokenChart timeRange={timeRange} />

          {/* Token Counter */}
          <TokenBreakdown timeRange={timeRange} />
        </div>
      </ScrollArea>
    </div>
  );
}
