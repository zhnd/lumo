import type {
  NotificationSettingResponse,
  TerminalNotifChannel,
} from "@/generated/typeshare-types";

export type NotificationAction =
  | "banner_sound"
  | "banner_only"
  | "sound_only"
  | "disabled";

export interface UseServiceReturn {
  settings: NotificationSettingResponse[];
  isLoading: boolean;
  error: string | undefined;
  updateSetting: (setting: NotificationSettingResponse) => void;
  isUpdating: boolean;
  activeSection: string;
  setActiveSection: (section: string) => void;
  terminalNotifChannel: TerminalNotifChannel;
  isTerminalNotifLoading: boolean;
  setTerminalNotifChannel: (channel: TerminalNotifChannel) => void;
  uninstallDialogOpen: boolean;
  setUninstallDialogOpen: (open: boolean) => void;
  handleUninstall: (deleteAllData: boolean) => void;
}
