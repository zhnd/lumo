"use client";

import { EChart, emptyChartOption } from "@/components/echarts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CardChartEmptyProps {
  title: string;
  chartType?: "axis" | "pie";
  height?: number;
  className?: string;
}

export function CardChartEmpty({
  title,
  chartType = "axis",
  height = 220,
  className,
}: CardChartEmptyProps) {
  return (
    <Card className={cn("gap-3 py-4", className)}>
      <CardHeader className="px-4">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <EChart option={emptyChartOption(chartType)} style={{ height }} />
      </CardContent>
    </Card>
  );
}
