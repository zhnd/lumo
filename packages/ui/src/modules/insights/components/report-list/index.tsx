"use client";

import { FileText } from "lucide-react";
import type { ReportListProps } from "./types";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReportList({ reports, onSelect }: ReportListProps) {
  return (
    <div className="space-y-2">
      {reports.map((report) => (
        <button
          key={report.path}
          type="button"
          onClick={() => onSelect(report)}
          className="flex w-full items-center gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
            <FileText className="size-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{report.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(report.createdAt)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
