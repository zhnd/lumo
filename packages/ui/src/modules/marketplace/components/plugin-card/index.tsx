"use client";

import {
  Check,
  ChevronDown,
  Download,
  FolderOpen,
  Globe,
  Loader2,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORY_LABELS, scopeLabel } from "../../types";
import type { PluginCardProps } from "./types";

function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  }
  return count.toString();
}

export function PluginCard({
  plugin,
  projects,
  installingName,
  uninstallingName,
  onInstall,
  onUninstall,
  onSelect,
}: PluginCardProps) {
  const isThisInstalling = installingName === plugin.name;
  const isThisUninstalling = uninstallingName === plugin.name;
  const isBusy = installingName !== null || uninstallingName !== null;
  const isInstalled = plugin.installedScopes.length > 0;

  return (
    <Card
      className="cursor-pointer gap-2 py-4 transition-colors hover:bg-accent/30"
      onClick={() => onSelect(plugin)}
    >
      <CardHeader className="px-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="truncate text-sm">{plugin.name}</CardTitle>
              {plugin.category && (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {CATEGORY_LABELS[plugin.category] ?? plugin.category}
                </Badge>
              )}
            </div>
            {isInstalled && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {plugin.installedScopes.map((s) => (
                  <Badge
                    key={`${s.scope}-${s.projectPath ?? ""}`}
                    variant="outline"
                    className="gap-1 text-[10px]"
                  >
                    {s.scope === "user" ? (
                      <Globe className="size-2.5" />
                    ) : (
                      <FolderOpen className="size-2.5" />
                    )}
                    {scopeLabel(s, projects)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div
            className="flex shrink-0 items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {isInstalled ? (
              <>
                <Badge variant="default" className="gap-1 text-xs">
                  <Check className="size-3" />
                  Installed
                </Badge>
                {plugin.installedScopes.length === 1 ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    disabled={isBusy}
                    onClick={() =>
                      onUninstall(
                        plugin,
                        plugin.installedScopes[0].scope === "project"
                          ? plugin.installedScopes[0].projectPath!
                          : null,
                      )
                    }
                  >
                    {isThisUninstalling ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        disabled={isBusy}
                      >
                        {isThisUninstalling ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {plugin.installedScopes.map((s) => (
                        <DropdownMenuItem
                          key={`${s.scope}-${s.projectPath ?? ""}`}
                          onClick={() =>
                            onUninstall(
                              plugin,
                              s.scope === "project" ? s.projectPath! : null,
                            )
                          }
                        >
                          {s.scope === "user" ? (
                            <Globe className="mr-2 size-3.5" />
                          ) : (
                            <FolderOpen className="mr-2 size-3.5" />
                          )}
                          {scopeLabel(s, projects)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5"
                    disabled={isBusy}
                  >
                    {isThisInstalling ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                    Install
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onInstall(plugin, null)}>
                    <Globe className="mr-2 size-3.5" />
                    Global
                  </DropdownMenuItem>
                  {projects.map((p) => (
                    <DropdownMenuItem
                      key={p.projectPath}
                      onClick={() => onInstall(plugin, p.projectPath)}
                    >
                      <FolderOpen className="mr-2 size-3.5" />
                      {p.projectName}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {plugin.description || "No description"}
        </p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          {plugin.authorName && <span>{plugin.authorName}</span>}
          {plugin.installCount != null && plugin.installCount > 0 && (
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {formatCount(plugin.installCount)}
            </span>
          )}
          {plugin.version && <span>v{plugin.version}</span>}
          <span className="text-muted-foreground/60">
            {plugin.marketplaceName}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
