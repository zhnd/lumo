export const HOOK_EVENT_CONFIG = [
  {
    key: "Notification:permission_prompt",
    label: "Permission Prompt",
    description: "Claude needs a permission approval",
    category: "Notification",
  },
  {
    key: "Notification:idle_prompt",
    label: "Idle Prompt",
    description: "Claude is idle and waiting for input",
    category: "Notification",
  },
  {
    key: "Notification:auth_success",
    label: "Auth Success",
    description: "Authentication succeeded",
    category: "Notification",
  },
  {
    key: "Notification:*",
    label: "Other Notifications",
    description: "All other notification types",
    category: "Notification",
  },
  {
    key: "Stop",
    label: "Task Complete",
    description: "Claude finishes responding",
    category: "Session",
  },
  {
    key: "SubagentStop",
    label: "Subagent Complete",
    description: "A subagent finishes its work",
    category: "Session",
  },
] as const;

export const NOTIFICATION_ACTION_OPTIONS = [
  { value: "banner_sound", label: "Banner & Sound" },
  { value: "banner_only", label: "Banner Only" },
  { value: "sound_only", label: "Sound Only" },
  { value: "disabled", label: "Disabled" },
] as const;

import { TerminalNotifChannel } from "@/generated/typeshare-types";

export const TERMINAL_NOTIF_OPTIONS = [
  { value: TerminalNotifChannel.Auto, label: "Auto" },
  { value: TerminalNotifChannel.Iterm2, label: "iTerm2" },
  { value: TerminalNotifChannel.Iterm2WithBell, label: "iTerm2 + Bell" },
  { value: TerminalNotifChannel.TerminalBell, label: "Terminal Bell" },
  { value: TerminalNotifChannel.Kitty, label: "Kitty" },
  { value: TerminalNotifChannel.Ghostty, label: "Ghostty" },
  { value: TerminalNotifChannel.NotificationsDisabled, label: "Disabled" },
] as const;

export const SETTINGS_SECTIONS = [
  { id: "notifications", label: "Notifications" },
  { id: "system", label: "System" },
  { id: "uninstall", label: "Uninstall" },
] as const;
