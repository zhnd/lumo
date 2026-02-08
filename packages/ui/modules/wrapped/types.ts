import type { WrappedData, WrappedPeriod } from "@/src/generated/typeshare-types";

export interface UseServiceReturn {
  period: WrappedPeriod;
  setPeriod: (period: WrappedPeriod) => void;
  data: WrappedData | undefined;
  hasMeaningfulData: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
