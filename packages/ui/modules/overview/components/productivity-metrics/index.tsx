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
import { CardLoading } from "@/components/card-loading";
import { CardError } from "@/components/card-error";
import { CardEmpty } from "@/components/card-empty";
import { useService } from "./use-service";
import type { ProductivityMetricsProps } from "./types";

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

export function ProductivityMetrics({ timeRange }: ProductivityMetricsProps) {
  const { data, isLoading, error, refetch } = useService(timeRange);

  if (isLoading) {
    return <CardLoading showTitle />;
  }

  if (error) {
    return (
      <CardError
        title="Productivity"
        message="Failed to load productivity data"
        onRetry={() => refetch()}
      />
    );
  }

  const hasData =
    data.linesAdded > 0 ||
    data.linesRemoved > 0 ||
    data.pullRequests > 0 ||
    data.commits > 0 ||
    data.codeEditsAccepted > 0 ||
    data.codeEditsRejected > 0;

  if (!hasData) {
    return (
      <CardEmpty title="Productivity" message="No productivity data available" />
    );
  }

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
