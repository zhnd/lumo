"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SubscriptionUsageBridge } from "@/bridges/subscription-usage-bridge";
import { AUTO_REFRESH_INTERVAL_MS, QUERY_KEY } from "./constants";
import type { FetchStatus, UseServiceReturn } from "./types";

export function useService(): UseServiceReturn {
  const [now, setNow] = useState(() => Date.now());

  // Tick every 30s so "Last updated" text stays fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { data, error, isLoading, isRefetching, refetch, dataUpdatedAt } =
    useQuery({
      queryKey: [...QUERY_KEY],
      queryFn: () => SubscriptionUsageBridge.fetchUsage(),
      staleTime: AUTO_REFRESH_INTERVAL_MS,
      refetchInterval: AUTO_REFRESH_INTERVAL_MS,
      refetchOnWindowFocus: true,
      retry: 1,
    });

  let status: FetchStatus = "idle";
  if (isLoading) {
    status = "loading";
  } else if (error) {
    status = "error";
  } else if (data?.needsLogin) {
    status = "login";
  } else if (data?.error) {
    status = "error";
  } else if (data?.usage) {
    status = "success";
  } else if (data && data.subscriptionType === "API" && !data.usage) {
    // Pay-per-use API billing account — no quotas to show.
    status = "api_billing";
  }

  return {
    status,
    data: data ?? null,
    error: error ? String(error) : (data?.error ?? null),
    refresh: () => refetch(),
    isRefreshing: isRefetching,
    now,
    fetchedAt: dataUpdatedAt,
  };
}
