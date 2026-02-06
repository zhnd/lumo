"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UsageBridge } from "@/src/bridges/usage-bridge";
import type { UseServiceReturn } from "./types";

const HAS_API_KEY_QUERY_KEY = ["has-api-key"] as const;
const USAGE_LIMITS_QUERY_KEY = ["usage-limits"] as const;
const REFETCH_INTERVAL = 60_000;

export function useService(): UseServiceReturn {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");

  const hasApiKeyQuery = useQuery({
    queryKey: [...HAS_API_KEY_QUERY_KEY],
    queryFn: () => UsageBridge.hasApiKey(),
    retry: false,
  });

  const hasApiKey = hasApiKeyQuery.data ?? false;

  const usageLimitsQuery = useQuery({
    queryKey: [...USAGE_LIMITS_QUERY_KEY],
    queryFn: () => UsageBridge.getUsageLimits(),
    enabled: hasApiKey,
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const handleStartEditing = useCallback(() => {
    setIsEditing(true);
    setApiKeyInput("");
  }, []);

  const handleCancelEditing = useCallback(() => {
    setIsEditing(false);
    setApiKeyInput("");
  }, []);

  const handleSaveApiKey = useCallback(async () => {
    if (!apiKeyInput.trim()) return;
    try {
      await UsageBridge.saveApiKey(apiKeyInput.trim());
      setIsEditing(false);
      setApiKeyInput("");
      await queryClient.invalidateQueries({
        queryKey: [...HAS_API_KEY_QUERY_KEY],
      });
      await queryClient.invalidateQueries({
        queryKey: [...USAGE_LIMITS_QUERY_KEY],
      });
    } catch {
      // Keep editing state on error
    }
  }, [apiKeyInput, queryClient]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [...USAGE_LIMITS_QUERY_KEY] });
  }, [queryClient]);

  const handleDeleteApiKey = useCallback(async () => {
    try {
      await UsageBridge.deleteApiKey();
      queryClient.removeQueries({ queryKey: [...USAGE_LIMITS_QUERY_KEY] });
      await queryClient.invalidateQueries({
        queryKey: [...HAS_API_KEY_QUERY_KEY],
      });
    } catch {
      // Silently handle error
    }
  }, [queryClient]);

  return {
    hasApiKey,
    isLoading: hasApiKeyQuery.isLoading,
    usageLimits: usageLimitsQuery.data ?? null,
    isEditing,
    apiKeyInput,
    isFetching: usageLimitsQuery.isFetching,
    setApiKeyInput,
    handleStartEditing,
    handleCancelEditing,
    handleSaveApiKey,
    handleRefresh,
    handleDeleteApiKey,
  };
}
