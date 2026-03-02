"use client";

export const foregroundRefreshQueryOptions = {
  refetchOnWindowFocus: true,
  refetchInterval: 60_000,
  refetchIntervalInBackground: false,
} as const;

export const watcherBackedQueryOptions = {
  refetchOnWindowFocus: true,
  refetchInterval: 300_000,
  refetchIntervalInBackground: false,
} as const;
