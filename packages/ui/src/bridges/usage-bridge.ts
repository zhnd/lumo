import { invoke } from "@tauri-apps/api/core";
import type { UsageLimits } from "../generated/typeshare-types";

export class UsageBridge {
  static getUsageLimits = () => invoke<UsageLimits>("get_usage_limits");
  static saveApiKey = (apiKey: string) =>
    invoke<void>("save_api_key", { apiKey });
  static hasApiKey = () => invoke<boolean>("has_api_key");
  static deleteApiKey = () => invoke<void>("delete_api_key");
}
