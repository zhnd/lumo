"use client";

import { ArrowLeft, FileText, Loader2, Sparkles } from "lucide-react";
import { CardEmpty } from "@/components/card-empty";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportList, ReportViewer } from "./components";
import { useService } from "./use-service";

export function Insights() {
  const {
    reports,
    isLoading,
    isGenerating,
    generateError,
    selectedReport,
    reportHtml,
    isLoadingHtml,
    generate,
    selectReport,
    clearSelection,
  } = useService();

  // Report viewer mode
  if (selectedReport) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <PageHeader title={selectedReport.fileName}>
          <Button variant="outline" size="sm" onClick={clearSelection}>
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Button>
        </PageHeader>
        <div className="flex-1 overflow-hidden">
          {isLoadingHtml ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : reportHtml ? (
            <ReportViewer html={reportHtml} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Failed to load report
            </div>
          )}
        </div>
      </div>
    );
  }

  // List mode
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Insights">
        <Button
          variant="outline"
          size="sm"
          onClick={generate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 size-4" />
          )}
          {isGenerating ? "Generating..." : "Generate report"}
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-muted/40">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-[72px] w-full rounded-lg" />
              <Skeleton className="h-[72px] w-full rounded-lg" />
            </div>
          )}

          {!isLoading && reports.length === 0 && (
            <CardEmpty
              icon={<FileText className="size-8 text-muted-foreground" />}
              title="No reports yet"
              message='Click "Generate report" to create your first insights report. This runs claude /insights to analyze your Claude Code sessions.'
            />
          )}

          {!isLoading && reports.length > 0 && (
            <ReportList reports={reports} onSelect={selectReport} />
          )}

          {generateError && (
            <p className="mt-4 text-sm text-destructive">{generateError}</p>
          )}

          {isGenerating && (
            <p className="mt-4 text-sm text-muted-foreground">
              Generating insights report... This may take a few minutes.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
