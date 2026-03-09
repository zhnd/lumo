import type {
  ClaudeProjectSummary,
  MarketplacePlugin,
} from "@/generated/typeshare-types";

export interface PluginDetailProps {
  plugin: MarketplacePlugin | null;
  projects: ClaudeProjectSummary[];
  onClose: () => void;
  installingName: string | null;
  uninstallingName: string | null;
  onInstall: (plugin: MarketplacePlugin, projectPath: string | null) => void;
  onUninstall: (plugin: MarketplacePlugin, projectPath: string | null) => void;
}
