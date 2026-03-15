"use client";

import { Bell, Info, Monitor, Volume2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  type NotificationSettingResponse,
  TerminalNotifChannel,
} from "@/generated/typeshare-types";
import {
  HOOK_EVENT_CONFIG,
  NOTIFICATION_ACTION_OPTIONS,
  TERMINAL_NOTIF_OPTIONS,
} from "../../constants";
import type { NotificationAction } from "../../types";

interface NotificationSettingsProps {
  settings: NotificationSettingResponse[];
  onUpdate: (setting: NotificationSettingResponse) => void;
  terminalNotifChannel: TerminalNotifChannel;
  isTerminalNotifLoading: boolean;
  onTerminalNotifChannelChange: (channel: TerminalNotifChannel) => void;
}

function toAction(s: NotificationSettingResponse): NotificationAction {
  if (!s.enabled) return "disabled";
  if (s.showBanner && s.playSound) return "banner_sound";
  if (s.showBanner) return "banner_only";
  if (s.playSound) return "sound_only";
  return "disabled";
}

function fromAction(
  s: NotificationSettingResponse,
  action: NotificationAction,
): NotificationSettingResponse {
  switch (action) {
    case "banner_sound":
      return { ...s, enabled: true, showBanner: true, playSound: true };
    case "banner_only":
      return { ...s, enabled: true, showBanner: true, playSound: false };
    case "sound_only":
      return { ...s, enabled: true, showBanner: false, playSound: true };
    case "disabled":
      return { ...s, enabled: false, showBanner: false, playSound: false };
  }
}

export function NotificationSettings({
  settings,
  onUpdate,
  terminalNotifChannel,
  isTerminalNotifLoading,
  onTerminalNotifChannelChange,
}: NotificationSettingsProps) {
  const globalSetting = settings.find((s) => s.hookEvent === "*");
  const globalEnabled = globalSetting?.enabled ?? true;
  const globalPlaySound = globalSetting?.playSound ?? true;

  const categories = HOOK_EVENT_CONFIG.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, (typeof HOOK_EVENT_CONFIG)[number][]>,
  );

  const showDuplicateWarning =
    globalEnabled &&
    terminalNotifChannel !== TerminalNotifChannel.NotificationsDisabled;

  return (
    <div className="space-y-6">
      {/* Terminal notification channel */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Monitor className="size-4 text-muted-foreground" />
          <div>
            <Label className="font-medium">Terminal notifications</Label>
            <p className="text-xs text-muted-foreground">
              Claude Code&apos;s built-in terminal alerts
            </p>
          </div>
        </div>
        <Select
          value={terminalNotifChannel}
          disabled={isTerminalNotifLoading}
          onValueChange={(v) =>
            onTerminalNotifChannelChange(v as TerminalNotifChannel)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TERMINAL_NOTIF_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Lumo notification controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            <Label htmlFor="global-enabled" className="font-medium">
              Lumo notifications
            </Label>
          </div>
          <Switch
            id="global-enabled"
            checked={globalEnabled}
            onCheckedChange={(enabled) =>
              globalSetting &&
              onUpdate({
                ...globalSetting,
                enabled,
                showBanner: enabled ? globalSetting.showBanner : false,
                playSound: enabled ? globalSetting.playSound : false,
              })
            }
          />
        </div>

        {globalEnabled && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="size-4 text-muted-foreground" />
              <Label htmlFor="global-sound" className="font-medium">
                Play sound
              </Label>
            </div>
            <Switch
              id="global-sound"
              checked={globalPlaySound}
              onCheckedChange={(playSound) =>
                globalSetting && onUpdate({ ...globalSetting, playSound })
              }
            />
          </div>
        )}
      </div>

      {/* Duplicate warning */}
      {showDuplicateWarning && (
        <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Both terminal and Lumo notifications are active. You may receive
            duplicate alerts for Notification events. Set terminal to
            &quot;Disabled&quot; to let Lumo handle all notifications.
          </p>
        </div>
      )}

      {globalEnabled && (
        <>
          <Separator />
          {Object.entries(categories).map(([category, items]) => (
            <div key={category} className="space-y-1">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {category}
              </p>
              {items.map((item) => {
                const setting = settings.find((s) => s.hookEvent === item.key);
                if (!setting) return null;

                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-4 rounded-md px-3 py-2.5 hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <Select
                      value={toAction(setting)}
                      onValueChange={(value) =>
                        onUpdate(
                          fromAction(setting, value as NotificationAction),
                        )
                      }
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTIFICATION_ACTION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
