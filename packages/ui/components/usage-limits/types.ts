import type { UsageLimits } from "@/src/generated/typeshare-types";

export interface UseServiceReturn {
  hasApiKey: boolean;
  isLoading: boolean;
  usageLimits: UsageLimits | null;
  isEditing: boolean;
  apiKeyInput: string;
  isFetching: boolean;
  setApiKeyInput: (value: string) => void;
  handleStartEditing: () => void;
  handleCancelEditing: () => void;
  handleSaveApiKey: () => void;
  handleRefresh: () => void;
  handleDeleteApiKey: () => void;
}
