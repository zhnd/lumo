"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UpdateIndicator } from "@/components/update-indicator";
import { useService } from "./use-service";
import { NAV_ITEMS } from "./constants";

export function AppSidebar() {
  const { activeItem, onNavItemClick } = useService();

  return (
    <Sidebar variant="floating" collapsible="icon">
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
        {/* <UsageLimits /> */}
      </SidebarFooter>
    </Sidebar>
  );
}
