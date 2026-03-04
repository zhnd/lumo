"use client";

import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export type DaemonStatus = "connected" | "disconnected";

const POLL_INTERVAL_MS = 10 * 1000; // 10 seconds

export function useDaemonStatus(): DaemonStatus {
  const { data } = useQuery({
    queryKey: ["daemon-status"],
    queryFn: async () => {
      try {
        return await invoke<boolean>("get_daemon_status");
      } catch {
        return false;
      }
    },
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

  return data ? "connected" : "disconnected";
}
