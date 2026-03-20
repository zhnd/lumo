"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { NotificationSettingsBridge } from "@/bridges/notification-settings-bridge";
import { UninstallBridge } from "@/bridges/uninstall-bridge";
import {
  type NotificationSettingResponse,
  TerminalNotifChannel,
} from "@/generated/typeshare-types";
import type { UseServiceReturn } from "./types";

export function useService(): UseServiceReturn {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("notifications");
  const [uninstallDialogOpen, setUninstallDialogOpen] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["notification_settings"],
    queryFn: () => NotificationSettingsBridge.getAll(),
  });

  const terminalNotifQuery = useQuery({
    queryKey: ["terminal_notif_channel"],
    queryFn: () => NotificationSettingsBridge.getTerminalNotifChannel(),
  });

  const updateMutation = useMutation({
    mutationFn: (setting: NotificationSettingResponse) =>
      NotificationSettingsBridge.update({
        hookEvent: setting.hookEvent,
        enabled: setting.enabled,
        showBanner: setting.showBanner,
        playSound: setting.playSound,
      }),
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: ["notification_settings"] });
      const previous = queryClient.getQueryData<NotificationSettingResponse[]>([
        "notification_settings",
      ]);
      queryClient.setQueryData<NotificationSettingResponse[]>(
        ["notification_settings"],
        (old) =>
          old?.map((s) => (s.hookEvent === updated.hookEvent ? updated : s)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notification_settings"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notification_settings"] });
    },
  });

  const terminalNotifMutation = useMutation({
    mutationFn: (channel: TerminalNotifChannel) =>
      NotificationSettingsBridge.setTerminalNotifChannel(channel),
    onMutate: async (channel) => {
      await queryClient.cancelQueries({
        queryKey: ["terminal_notif_channel"],
      });
      const previous = queryClient.getQueryData<TerminalNotifChannel>([
        "terminal_notif_channel",
      ]);
      queryClient.setQueryData(["terminal_notif_channel"], channel);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["terminal_notif_channel"], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["terminal_notif_channel"],
      });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: (deleteAllData: boolean) =>
      UninstallBridge.uninstall(deleteAllData),
  });

  const handleUninstall = (deleteAllData: boolean) => {
    uninstallMutation.mutate(deleteAllData);
  };

  return {
    settings: settingsQuery.data ?? [],
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error?.message,
    updateSetting: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    activeSection,
    setActiveSection,
    terminalNotifChannel: terminalNotifQuery.data ?? TerminalNotifChannel.Auto,
    isTerminalNotifLoading: terminalNotifQuery.isLoading,
    setTerminalNotifChannel: terminalNotifMutation.mutate,
    uninstallDialogOpen,
    setUninstallDialogOpen,
    handleUninstall,
  };
}
