import type { EChartsOption } from "echarts";
import type { UsageBucket } from "@/generated/typeshare-types";

export interface UsageBucketCardProps {
  label: string;
  bucket: UsageBucket;
}

export type UsageStatus = "healthy" | "warning" | "critical";

export interface UsageStatusTheme {
  /** Primary color for the center number and the progress fill start. */
  primary: string;
  /** Gauge progress gradient start color. */
  gradientStart: string;
  /** Gauge progress gradient end color. */
  gradientEnd: string;
}

export interface UseUsageBucketCardResult {
  /** `true` when the backend reports the bucket as present but with no
   *  usage yet (e.g. a Max account that hasn't touched Sonnet). The
   *  gauge is still rendered at 100% remaining; the parent uses this
   *  flag to swap the reset text for a "You haven't used X yet" hint. */
  isUntouched: boolean;
  percentRemaining: number;
  status: UsageStatus;
  option: EChartsOption;
  resetText: string | null;
}
