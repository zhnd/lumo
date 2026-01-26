import type { TimeRange } from "@/src/generated/typeshare-types";

export interface ProductivityMetricsProps {
  timeRange: TimeRange;
}

export interface ProductivityMetricsData {
  linesAdded: number;
  linesRemoved: number;
  pullRequests: number;
  commits: number;
  codeEditsAccepted: number;
  codeEditsRejected: number;
}
