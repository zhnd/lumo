import { invoke } from "@tauri-apps/api/core";
import type {
  NotificationSettingResponse,
  TerminalNotifChannel,
  UpdateNotificationSettingRequest,
} from "../generated/typeshare-types";

/**
 * Notification Settings Bridge - Frontend interface for notification preferences
 */
export class NotificationSettingsBridge {
  static async getAll(): Promise<NotificationSettingResponse[]> {
    return invoke<NotificationSettingResponse[]>("get_notification_settings");
  }

  static async update(
    request: UpdateNotificationSettingRequest,
  ): Promise<void> {
    return invoke<void>("update_notification_setting", { request });
  }

  static async getTerminalNotifChannel(): Promise<TerminalNotifChannel> {
    return invoke<TerminalNotifChannel>("get_terminal_notif_channel");
  }

  static async setTerminalNotifChannel(
    channel: TerminalNotifChannel,
  ): Promise<void> {
    return invoke<void>("set_terminal_notif_channel", { channel });
  }
}
