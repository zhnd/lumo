"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UseServiceReturn, UpdateProgress } from "./types";
import { UPDATE_STATUS } from "./types";
import { QUERY_KEY, UPDATE_CHECK_INTERVAL_MS } from "./constants";

async function downloadUpdate(
  update: NonNullable<
    Awaited<ReturnType<typeof import("@tauri-apps/plugin-updater").check>>
  >,
  setStatus: (s: UseServiceReturn["status"]) => void,
  setProgress: React.Dispatch<React.SetStateAction<UpdateProgress>>
) {
  setStatus(UPDATE_STATUS.Downloading);
  setProgress({ contentLength: undefined, downloaded: 0 });
  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      setProgress({
        contentLength: event.data.contentLength ?? undefined,
        downloaded: 0,
      });
    } else if (event.event === "Progress") {
      setProgress((prev) => ({
        ...prev,
        downloaded: prev.downloaded + (event.data.chunkLength ?? 0),
      }));
    }
  });
  setStatus(UPDATE_STATUS.ReadyToRelaunch);
}

export function useService(): UseServiceReturn {
  const [status, setStatus] = useState<UseServiceReturn["status"]>(
    UPDATE_STATUS.Idle
  );
  const [progress, setProgress] = useState<UpdateProgress>({
    contentLength: undefined,
    downloaded: 0,
  });
  const [updateInfo, setUpdateInfo] = useState<UseServiceReturn["updateInfo"]>(
    null
  );
  const downloadingRef = useRef(false);

  useQuery({
    queryKey: [...QUERY_KEY],
    queryFn: async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update) {
          setUpdateInfo({
            version: update.version,
            date: update.date,
            body: update.body,
          });
          // Auto-download in background
          if (!downloadingRef.current) {
            downloadingRef.current = true;
            downloadUpdate(update, setStatus, setProgress).catch(() => {
              setStatus(UPDATE_STATUS.Error);
              downloadingRef.current = false;
            });
          }
          return { available: true, version: update.version };
        }
        return { available: false };
      } catch {
        return { available: false };
      }
    },
    refetchInterval: UPDATE_CHECK_INTERVAL_MS,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const downloadPercent =
    progress.contentLength && progress.contentLength > 0
      ? Math.round((progress.downloaded / progress.contentLength) * 100)
      : 0;

  const relaunchApp = useCallback(async () => {
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch {
      setStatus(UPDATE_STATUS.Error);
    }
  }, []);

  return {
    status,
    progress,
    updateInfo,
    downloadPercent,
    relaunchApp,
  };
}
