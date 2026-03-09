"use client";

import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    isPermissionGranted().then((granted) => {
      if (!granted) requestPermission();
    });
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            toast.error("Request failed", {
              description: error.message,
              action: {
                label: "Copy",
                onClick: () =>
                  navigator.clipboard.writeText(
                    `Query: ${JSON.stringify(query.queryKey)}\nError: ${error.message}\nTime: ${new Date().toLocaleString()}`,
                  ),
              },
            });
          },
        }),
        defaultOptions: {
          queries: {
            // Keep defaults conservative; per-query refresh policy is configured in each module.
            refetchOnWindowFocus: false,
            // Retry once on failure
            retry: 1,
            // Keep data fresh for 30 seconds
            staleTime: 30 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
