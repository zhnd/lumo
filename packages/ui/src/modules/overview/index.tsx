"use client";

import { PageHeader } from "@/components/page-header";
import {
  TimeRangeTabs,
  StatCards,
  CostChart,
  ActivityHeatmap,
} from "./components";
import { useService } from "./use-service";

export function Overview() {
  const { timeRange, setTimeRange } = useService();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Overview">
        <TimeRangeTabs value={timeRange} onChange={setTimeRange} />
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-muted/40">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          <StatCards timeRange={timeRange} />
          <CostChart timeRange={timeRange} />
          <ActivityHeatmap />
        </div>
      </div>
    </div>
  );
}
