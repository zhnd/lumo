import { invoke } from "@tauri-apps/api/core";
import type { SubscriptionUsageResult } from "../generated/typeshare-types";

export class SubscriptionUsageBridge {
  static fetchUsage = () =>
    invoke<SubscriptionUsageResult>("fetch_subscription_usage");
  static showLogin = () => invoke<void>("show_claude_login");
  static hideLogin = () => invoke<void>("hide_claude_login");
  static logout = () => invoke<void>("logout_claude");
}
