import { invoke } from "@tauri-apps/api/core";
import type {
  MarketplaceCommandResult,
  MarketplaceInfo,
  MarketplacePlugin,
} from "../generated/typeshare-types";

/**
 * Marketplace Bridge - Frontend interface for plugin marketplace management
 */
export class MarketplaceBridge {
  static async listPlugins(): Promise<MarketplacePlugin[]> {
    return invoke<MarketplacePlugin[]>("list_marketplace_plugins");
  }

  static async listMarketplaces(): Promise<MarketplaceInfo[]> {
    return invoke<MarketplaceInfo[]>("list_marketplaces");
  }

  static async installPlugin(
    name: string,
    projectPath: string | null = null,
  ): Promise<MarketplaceCommandResult> {
    return invoke<MarketplaceCommandResult>("install_marketplace_plugin", {
      name,
      projectPath,
    });
  }

  static async uninstallPlugin(
    name: string,
    projectPath: string | null = null,
  ): Promise<MarketplaceCommandResult> {
    return invoke<MarketplaceCommandResult>("uninstall_marketplace_plugin", {
      name,
      projectPath,
    });
  }

  static async addMarketplace(
    source: string,
  ): Promise<MarketplaceCommandResult> {
    return invoke<MarketplaceCommandResult>("add_marketplace", { source });
  }

  static async removeMarketplace(
    name: string,
  ): Promise<MarketplaceCommandResult> {
    return invoke<MarketplaceCommandResult>("remove_marketplace", { name });
  }

  static async updateMarketplaces(): Promise<MarketplaceCommandResult> {
    return invoke<MarketplaceCommandResult>("update_marketplaces");
  }
}
