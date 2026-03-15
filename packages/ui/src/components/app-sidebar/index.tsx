"use client";

import { Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UpdateIndicator } from "@/components/update-indicator";
import { NAV_ITEMS } from "./constants";
import { useService } from "./use-service";

export function AppSidebar() {
  const { activeItem, onNavItemClick } = useService();

  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      className="top-(--titlebar-height) h-[calc(100svh-var(--titlebar-height))]"
    >
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
            <SidebarMenuButton
              isActive={activeItem === "settings"}
              tooltip="Settings"
              className="h-9"
              onClick={() => onNavItemClick("settings")}
            >
              <Settings className="size-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
