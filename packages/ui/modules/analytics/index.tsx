"use client";

import { PageHeader } from "@/components/page-header";
import { TimeRangeTabs } from "@/modules/overview/components/time-range-tabs";
import {
  CacheHitTrend,
  CostEfficiencyTrend,
  PeakHoursChart,
  ModelMix,
  TokenModelChart,
} from "./components";
import { useService } from "./use-service";

export function Analytics() {
  const { timeRange, setTimeRange } = useService();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Analytics">
        <TimeRangeTabs value={timeRange} onChange={setTimeRange} />
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-muted/40">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <CacheHitTrend timeRange={timeRange} />
            <CostEfficiencyTrend timeRange={timeRange} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <PeakHoursChart timeRange={timeRange} />
            <ModelMix timeRange={timeRange} />
          </div>
          <TokenModelChart timeRange={timeRange} />
        </div>
      </div>
    </div>
  );
}
