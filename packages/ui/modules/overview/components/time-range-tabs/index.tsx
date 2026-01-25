"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TimeRange } from "../../types";

interface TimeRangeTabsProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

export function TimeRangeTabs({ value, onChange }: TimeRangeTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as TimeRange)}>
      <TabsList className="h-8">
        <TabsTrigger value="today" className="px-3 text-xs">
          Today
        </TabsTrigger>
        <TabsTrigger value="week" className="px-3 text-xs">
          Week
        </TabsTrigger>
        <TabsTrigger value="month" className="px-3 text-xs">
          Month
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
