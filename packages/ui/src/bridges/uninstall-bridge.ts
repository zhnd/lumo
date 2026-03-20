import { invoke } from "@tauri-apps/api/core";

export const UninstallBridge = {
  uninstall: (deleteAllData: boolean) =>
    invoke<void>("uninstall_app", { deleteAllData }),
};
