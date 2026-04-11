import { invoke } from "@tauri-apps/api/core";
import type { SubscriptionUsageResult } from "../generated/typeshare-types";

export class SubscriptionUsageBridge {
  static fetchUsage = () =>
    invoke<SubscriptionUsageResult>("fetch_subscription_usage");
}
