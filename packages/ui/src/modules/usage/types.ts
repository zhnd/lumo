import type { SubscriptionUsageResult } from "@/generated/typeshare-types";

export type FetchStatus =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "login"
  /** Pay-per-use API billing account. No subscription quotas to show;
   *  the page renders an informational empty state instead of gauges. */
  | "api_billing";

export interface UseServiceReturn {
  status: FetchStatus;
  data: SubscriptionUsageResult | null;
  error: string | null;
  refresh: () => void;
  isRefreshing: boolean;
  now: number;
  fetchedAt: number;
}
