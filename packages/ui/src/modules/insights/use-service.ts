"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { InsightsBridge } from "@/bridges/insights-bridge";
import type { InsightsReport } from "@/generated/typeshare-types";
import type { UseServiceReturn } from "./types";

const QUERY_KEY = ["insights-reports"] as const;

export function useService(): UseServiceReturn {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<InsightsReport | null>(
    null,
  );

  const reportsQuery = useQuery({
    queryKey: [...QUERY_KEY],
    queryFn: () => InsightsBridge.listReports(),
  });

  const generateMutation = useMutation({
    mutationFn: () => InsightsBridge.generate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY] });
    },
  });

  const reportHtmlQuery = useQuery({
    queryKey: ["insights-report-html", selectedReport?.path],
    queryFn: () => InsightsBridge.readReport(selectedReport!.path),
    enabled: !!selectedReport,
  });

  return {
    reports: reportsQuery.data ?? [],
    isLoading: reportsQuery.isLoading,
    isGenerating: generateMutation.isPending,
    generateError: generateMutation.error
      ? String(generateMutation.error)
      : null,
    selectedReport,
    reportHtml: reportHtmlQuery.data ?? null,
    isLoadingHtml: reportHtmlQuery.isLoading,
    generate: () => generateMutation.mutate(),
    selectReport: setSelectedReport,
    clearSelection: () => setSelectedReport(null),
  };
}
