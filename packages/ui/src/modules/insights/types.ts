import type { InsightsReport } from "@/generated/typeshare-types";

export interface UseServiceReturn {
  reports: InsightsReport[];
  isLoading: boolean;
  isGenerating: boolean;
  generateError: string | null;
  selectedReport: InsightsReport | null;
  reportHtml: string | null;
  isLoadingHtml: boolean;
  generate: () => void;
  selectReport: (report: InsightsReport) => void;
  clearSelection: () => void;
}
