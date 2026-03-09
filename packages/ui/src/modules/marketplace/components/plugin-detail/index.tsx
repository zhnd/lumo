"use client";

import { openUrl } from "@tauri-apps/plugin-opener";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  ExternalLink,
  FolderOpen,
  Globe,
  Loader2,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CATEGORY_LABELS, scopeLabel } from "../../types";
import type { PluginDetailProps } from "./types";

function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  }
  return count.toString();
}

export function PluginDetail({
  plugin,
  projects,
  onClose,
  installingName,
  uninstallingName,
  onInstall,
  onUninstall,
}: PluginDetailProps) {
  if (!plugin) return null;

  const isThisInstalling = installingName === plugin.name;
  const isThisUninstalling = uninstallingName === plugin.name;
  const isBusy = installingName !== null || uninstallingName !== null;
  const isInstalled = plugin.installedScopes.length > 0;

  // Scopes not yet installed (for "Install to" dropdown)
  const availableScopes = [
    // Global if not installed globally
    ...(!plugin.installedScopes.some((s) => s.scope === "user")
      ? [
          {
            label: "Global",
            path: null as string | null,
            icon: "globe" as const,
          },
        ]
      : []),
    // Projects not yet installed
    ...projects
      .filter(
        (p) =>
          !plugin.installedScopes.some(
            (s) => s.scope === "project" && s.projectPath === p.projectPath,
          ),
      )
      .map((p) => ({
        label: p.projectName,
        path: p.projectPath as string | null,
        icon: "folder" as const,
      })),
  ];

  return (
    <Sheet open={plugin !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{plugin.name}</SheetTitle>
          <SheetDescription>from {plugin.marketplaceName}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <p className="text-sm text-foreground">
            {plugin.description || "No description available."}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {plugin.category && (
              <Badge variant="secondary">
                {CATEGORY_LABELS[plugin.category] ?? plugin.category}
              </Badge>
            )}
            {plugin.version && (
              <Badge variant="outline">v{plugin.version}</Badge>
            )}
          </div>

          <Separator />

          <div className="flex flex-col gap-2 text-sm">
            {plugin.authorName && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Author</span>
                <span>{plugin.authorName}</span>
              </div>
            )}
            {plugin.installCount != null && plugin.installCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Installs</span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  {formatCount(plugin.installCount)}
                </span>
              </div>
            )}
            {plugin.tags.length > 0 && (
              <div className="flex items-start justify-between gap-4">
                <span className="shrink-0 text-muted-foreground">Tags</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {plugin.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Installed scopes */}
          {isInstalled && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Installed in
                </span>
                {plugin.installedScopes.map((s) => (
                  <div
                    key={`${s.scope}-${s.projectPath ?? ""}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      {s.scope === "user" ? (
                        <Globe className="size-3.5 text-muted-foreground" />
                      ) : (
                        <FolderOpen className="size-3.5 text-muted-foreground" />
                      )}
                      {scopeLabel(s, projects)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      disabled={isBusy}
                      onClick={() =>
                        onUninstall(
                          plugin,
                          s.scope === "project" ? s.projectPath! : null,
                        )
                      }
                    >
                      {isThisUninstalling ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {plugin.homepage && (
            <>
              <Separator />
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => openUrl(plugin.homepage!)}
              >
                <ExternalLink className="size-3.5" />
                Homepage
              </Button>
            </>
          )}

          <Separator />

          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p>
              Make sure you trust a plugin before installing, updating, or using
              it. Anthropic does not control what MCP servers, files, or other
              software are included in plugins and cannot verify that they will
              work as intended or that they won&apos;t change. See each
              plugin&apos;s homepage for more information.
            </p>
          </div>
        </div>

        <SheetFooter>
          {availableScopes.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full gap-1.5" disabled={isBusy}>
                  {isThisInstalling ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  {isInstalled ? "Install to..." : "Install"}
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                {availableScopes.map((s) => (
                  <DropdownMenuItem
                    key={s.path ?? "__global__"}
                    onClick={() => onInstall(plugin, s.path)}
                  >
                    {s.icon === "globe" ? (
                      <Globe className="mr-2 size-3.5" />
                    ) : (
                      <FolderOpen className="mr-2 size-3.5" />
                    )}
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
