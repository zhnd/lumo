"use client";

import {
  FileCode,
  GitPullRequest,
  GitCommit,
  MousePointerClick,
  Plus,
  Minus,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductivityMetrics as ProductivityMetricsType } from "../../types";

interface ProductivityMetricsProps {
  data: ProductivityMetricsType;
}

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function MetricItem({ icon, label, children }: MetricItemProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

export function ProductivityMetrics({ data }: ProductivityMetricsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Productivity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Lines of Code */}
          <MetricItem
            icon={<FileCode className="size-5 text-muted-foreground" />}
            label="Lines of Code"
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-lg font-bold text-green-600 dark:text-green-500">
                <Plus className="size-3.5" />
                {data.linesAdded.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-lg font-bold text-red-600 dark:text-red-500">
                <Minus className="size-3.5" />
                {data.linesRemoved.toLocaleString()}
              </span>
            </div>
          </MetricItem>

          {/* Pull Requests */}
          <MetricItem
            icon={<GitPullRequest className="size-5 text-muted-foreground" />}
            label="Pull Requests"
          >
            <p className="text-2xl font-bold">{data.pullRequests}</p>
          </MetricItem>

          {/* Commits */}
          <MetricItem
            icon={<GitCommit className="size-5 text-muted-foreground" />}
            label="Commits"
          >
            <p className="text-2xl font-bold">{data.commits}</p>
          </MetricItem>

          {/* Code Edits */}
          <MetricItem
            icon={<MousePointerClick className="size-5 text-muted-foreground" />}
            label="Code Edit Decisions"
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-lg font-bold text-green-600 dark:text-green-500">
                <Check className="size-3.5" />
                {data.codeEditsAccepted}
              </span>
              <span className="flex items-center gap-1 text-lg font-bold text-red-600 dark:text-red-500">
                <X className="size-3.5" />
                {data.codeEditsRejected}
              </span>
            </div>
          </MetricItem>
        </div>
      </CardContent>
    </Card>
  );
}
