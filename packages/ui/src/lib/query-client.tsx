"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    isPermissionGranted().then((granted) => {
      if (!granted) requestPermission();
    });
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Prevent refetch on window focus in desktop app
            refetchOnWindowFocus: false,
            // Retry once on failure
            retry: 1,
            // Keep data fresh for 30 seconds
            staleTime: 30 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
