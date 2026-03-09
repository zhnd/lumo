"use client";

import * as React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";

const STORAGE_KEY = "sidebar_open";

export function SidebarLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved !== null ? saved === "true" : true;
  });

  const handleOpenChange = React.useCallback((value: boolean) => {
    setOpen(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  return (
    <SidebarProvider
      open={open}
      onOpenChange={handleOpenChange}
      className={className}
      style={
        {
          "--sidebar-width": "12rem",
          "--sidebar-width-mobile": "16rem",
        } as React.CSSProperties
      }
    >
      {children}
    </SidebarProvider>
  );
}
