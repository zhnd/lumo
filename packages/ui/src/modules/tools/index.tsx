"use client";

import { PageHeader } from "@/components/page-header";
import { TimeRangeTabs } from "@/modules/overview/components/time-range-tabs";
import {
  ToolFrequencyBar,
  ToolSuccessRate,
  ToolDuration,
  CodeEditDecisions,
  ToolTimeline,
} from "./components";
import { useService } from "./use-service";

export function Tools() {
  const { timeRange, setTimeRange } = useService();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Tools">
        <TimeRangeTabs value={timeRange} onChange={setTimeRange} />
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-muted/40">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          <ToolFrequencyBar timeRange={timeRange} />
          <div className="grid gap-4 md:grid-cols-2">
            <ToolSuccessRate timeRange={timeRange} />
            <ToolDuration timeRange={timeRange} />
          </div>
          <CodeEditDecisions timeRange={timeRange} />
          <ToolTimeline timeRange={timeRange} />
        </div>
      </div>
    </div>
  );
}
