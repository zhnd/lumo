"use client";

import { Loader2, RotateCcw, CircleAlert } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useService } from "./use-service";
import { UPDATE_STATUS } from "./types";

export function UpdateIndicator() {
  const { status, downloadPercent, updateInfo, relaunchApp } = useService();

  if (status === UPDATE_STATUS.Idle || status === UPDATE_STATUS.Checking) {
    return null;
  }

  if (status === UPDATE_STATUS.Downloading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={`Downloading v${updateInfo?.version} ${downloadPercent}%`}
            className="h-9"
            disabled
          >
            <Loader2 className="size-4 animate-spin" />
            <span>Downloading {downloadPercent}%</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (status === UPDATE_STATUS.ReadyToRelaunch) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Restart to apply update"
            className="h-9 text-primary"
            onClick={relaunchApp}
          >
            <RotateCcw className="size-4" />
            <span>Restart to update</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (status === UPDATE_STATUS.Error) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Update failed"
            className="h-9 text-destructive"
            disabled
          >
            <CircleAlert className="size-4" />
            <span>Update failed</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return null;
}
