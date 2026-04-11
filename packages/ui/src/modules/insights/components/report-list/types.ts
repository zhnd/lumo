import type { InsightsReport } from "@/generated/typeshare-types";

export interface ReportListProps {
  reports: InsightsReport[];
  onSelect: (report: InsightsReport) => void;
}
