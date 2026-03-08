"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import { SubscriptionUsageBridge } from "@/bridges/subscription-usage-bridge";
import type { LoginResolvedPayload } from "@/generated/typeshare-types";
import { AUTO_REFRESH_INTERVAL_MS, QUERY_KEY } from "./constants";
import type { FetchStatus, UseServiceReturn } from "./types";

export function useService(): UseServiceReturn {
  const queryClient = useQueryClient();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Tick every 30s so "Last updated" text stays fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { data, error, isLoading, isRefetching, refetch } = useQuery({
    queryKey: [...QUERY_KEY],
    queryFn: () => SubscriptionUsageBridge.fetchUsage(),
    refetchInterval: AUTO_REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const onLogin = useCallback(async () => {
    setIsLoggingIn(true);
    try {
      await SubscriptionUsageBridge.showLogin();
    } catch {
      setIsLoggingIn(false);
    }
  }, []);

  const onSwitchAccount = useCallback(async () => {
    await SubscriptionUsageBridge.logout();
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEY] });
  }, [queryClient]);

  // Listen for Rust-side login event with typed payload.
  // Only re-fetch on success; cancelled/timeout just reset the login state.
  useEffect(() => {
    if (!isLoggingIn) return;

    let active = true;
    let unlisten: (() => void) | null = null;

    listen<LoginResolvedPayload>("claude-login-resolved", (event) => {
      if (!active) return;
      setIsLoggingIn(false);
      if (event.payload.status === "success") {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY] });
      }
    }).then((fn) => {
      if (active) {
        unlisten = fn;
      } else {
        fn();
      }
    });

    return () => {
      active = false;
      unlisten?.();
    };
  }, [isLoggingIn, queryClient]);

  let status: FetchStatus = "idle";
  if (isLoading) {
    status = "loading";
  } else if (error) {
    status = "error";
  } else if (data?.needsLogin) {
    status = "login";
  } else if (data?.parseError) {
    status = "parse-error";
  } else if (data?.error) {
    status = "error";
  } else if (data?.usage) {
    if (data.usage.categories.length === 0) {
      status = "no-subscription";
    } else {
      status = "success";
    }
  }

  return {
    status,
    data: data ?? null,
    error: error ? String(error) : (data?.error ?? null),
    refresh: () => refetch(),
    isRefreshing: isRefetching,
    onLogin,
    isLoggingIn,
    onSwitchAccount,
    now,
  };
}
