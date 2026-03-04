"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CardLoading } from "@/components/card-loading";
import { CardError } from "@/components/card-error";
import { CardEmpty } from "@/components/card-empty";
import { useService } from "./use-service";

const ROWS = 7;
const CELL_SIZE = 10;
const GAP = 3;
const LABEL_WIDTH = 20;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function getLevel(count: number, max: number): number {
  if (count === 0) return 0;
  const ratio = count / Math.max(max, 1);
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export function ActivityHeatmap() {
  const { data, isLoading, error, refetch } = useService();
  const [maxCols, setMaxCols] = useState<number | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const containerRef = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (!el) return;

    const measure = () => {
      const available = el.clientWidth - LABEL_WIDTH - GAP;
      const cols = Math.max(1, Math.floor((available + GAP) / (CELL_SIZE + GAP)));
      setMaxCols(cols);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observerRef.current = observer;
  }, []);

  const fullYear = useMemo(() => {
    const now = new Date();
    const map = new Map<string, number>();
    for (const d of data) {
      map.set(d.date, d.count);
    }

    const startDate = new Date(now);
    startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setDate(startDate.getDate() + 1);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const cells: Array<{
      date: string;
      count: number;
      col: number;
      row: number;
    }> = [];
    let max = 0;
    let total = 0;
    const monthLabels: Array<{ label: string; col: number }> = [];
    let lastMonth = -1;

    const currentDate = new Date(startDate);
    let col = 0;
    let row = 0;

    while (currentDate <= now) {
      const y = currentDate.getFullYear();
      const m = String(currentDate.getMonth() + 1).padStart(2, "0");
      const dd = String(currentDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${dd}`;
      const count = map.get(dateStr) ?? 0;
      max = Math.max(max, count);
      total += count;

      const month = currentDate.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ label: MONTH_NAMES[month], col });
        lastMonth = month;
      }

      cells.push({ date: dateStr, count, col, row });

      row++;
      if (row >= ROWS) {
        row = 0;
        col++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      cells,
      totalCols: col + 1,
      months: monthLabels,
      maxCount: max,
      totalSessions: total,
    };
  }, [data]);

  const { visibleCells, visibleMonths, colCount, maxCount, totalSessions } =
    useMemo(() => {
      if (maxCols === null) return { visibleCells: [], visibleMonths: [], colCount: 0, maxCount: 0, totalSessions: 0 };

      const { cells, totalCols, months, totalSessions } = fullYear;

      let colOffset = 0;
      if (totalCols > maxCols) {
        for (let i = 1; i < months.length; i++) {
          if (totalCols - months[i].col <= maxCols) {
            colOffset = months[i].col;
            break;
          }
        }
        if (colOffset === 0 && months.length > 0) {
          colOffset = months[months.length - 1].col;
        }
      }

      const displayCols = totalCols - colOffset;

      const visibleCells = cells
        .filter((c) => c.col >= colOffset)
        .map((c) => ({ ...c, col: c.col - colOffset }));

      const visibleMonths = months
        .filter((m) => m.col >= colOffset)
        .map((m) => ({ ...m, col: m.col - colOffset }));

      let visMax = 0;
      for (const c of visibleCells) visMax = Math.max(visMax, c.count);

      return {
        visibleCells,
        visibleMonths,
        colCount: displayCols,
        maxCount: visMax,
        totalSessions,
      };
    }, [fullYear, maxCols]);

  if (isLoading) return <CardLoading showTitle />;
  if (error) {
    return (
      <CardError
        title="Activity"
        message="Failed to load activity data"
        onRetry={() => refetch()}
      />
    );
  }
  if (data.length === 0) {
    return <CardEmpty title="Activity" message="No activity data yet" />;
  }

  const cellMap = new Map<string, (typeof visibleCells)[0]>();
  for (const c of visibleCells) {
    cellMap.set(`${c.col}-${c.row}`, c);
  }

  const renderHeatmap = maxCols !== null && colCount > 0;

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>Activity</CardTitle>
        <CardDescription>
          {totalSessions} sessions in the last year
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6" ref={containerRef}>
        {renderHeatmap && (
          <div className="flex flex-col items-center">
          <TooltipProvider delayDuration={0}>
            <div className="inline-flex gap-[3px]">
              {/* Day labels */}
              <div className="flex flex-col gap-[3px]" style={{ width: LABEL_WIDTH }}>
                {DAY_LABELS.map((label, i) => (
                  <span
                    key={i}
                    className="text-[10px] leading-none text-muted-foreground flex items-center justify-end"
                    style={{ height: CELL_SIZE }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              {/* Week columns */}
              {Array.from({ length: colCount }, (_, col) => (
                <div key={col} className="flex flex-col gap-[3px]">
                  {Array.from({ length: ROWS }, (_, row) => {
                    const cell = cellMap.get(`${col}-${row}`);
                    if (!cell) {
                      return <span key={row} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
                    }
                    const level = getLevel(cell.count, maxCount);
                    return (
                      <Tooltip key={row}>
                        <TooltipTrigger asChild>
                          <span
                            className="rounded-[2px]"
                            style={{
                              width: CELL_SIZE,
                              height: CELL_SIZE,
                              backgroundColor: `var(--heatmap-${level})`,
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-medium">{cell.date}</p>
                          <p className="text-muted-foreground">
                            {cell.count} {cell.count === 1 ? "session" : "sessions"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Month labels */}
            <div className="flex mt-1" style={{ paddingLeft: LABEL_WIDTH + GAP }}>
              {visibleMonths.map((m, i) => {
                const nextCol = i < visibleMonths.length - 1 ? visibleMonths[i + 1].col : colCount;
                const span = nextCol - m.col;
                return (
                  <span
                    key={i}
                    className="text-[10px] text-muted-foreground"
                    style={{ width: span * (CELL_SIZE + GAP) }}
                  >
                    {span >= 3 ? m.label : ""}
                  </span>
                );
              })}
            </div>
          </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
