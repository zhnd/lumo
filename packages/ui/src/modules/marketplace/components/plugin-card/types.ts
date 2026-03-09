import type {
  ClaudeProjectSummary,
  MarketplacePlugin,
} from "@/generated/typeshare-types";

export interface PluginCardProps {
  plugin: MarketplacePlugin;
  projects: ClaudeProjectSummary[];
  installingName: string | null;
  uninstallingName: string | null;
  onInstall: (plugin: MarketplacePlugin, projectPath: string | null) => void;
  onUninstall: (plugin: MarketplacePlugin, projectPath: string | null) => void;
  onSelect: (plugin: MarketplacePlugin) => void;
}
