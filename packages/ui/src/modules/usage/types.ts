import type { SubscriptionUsageResult } from "@/generated/typeshare-types";

export type FetchStatus =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "login"
  | "no-subscription"
  | "parse-error";

export interface UseServiceReturn {
  status: FetchStatus;
  data: SubscriptionUsageResult | null;
  error: string | null;
  refresh: () => void;
  isRefreshing: boolean;
  onLogin: () => void;
  isLoggingIn: boolean;
  onSwitchAccount: () => void;
  now: number;
}
