"use client";

import { Settings, FileText } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UpdateIndicator } from "@/components/update-indicator";
import { useService } from "./use-service";
import { NAV_ITEMS } from "./constants";

export function AppSidebar() {
  const { activeItem, onNavItemClick } = useService();

  return (
    <Sidebar variant="floating" collapsible="icon" className="top-(--titlebar-height) h-[calc(100svh-var(--titlebar-height))]">
      <SidebarContent className="pt-2">
        <SidebarMenu className="gap-0.5 px-2">
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={activeItem === item.id}
                tooltip={item.label}
                className="h-9"
                onClick={() => onNavItemClick(item.id)}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <UpdateIndicator />
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip="Settings" className="h-9">
                  <Settings className="size-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-48">
                <DropdownMenuItem onClick={() => invoke("open_log_directory")}>
                  <FileText className="size-4" />
                  <span>Open log files</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
