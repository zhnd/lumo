"use client";

import { Loader2, Plus, RefreshCw, Search, Store, Trash2 } from "lucide-react";
import { CardEmpty } from "@/components/card-empty";
import { CardError } from "@/components/card-error";
import { CardLoading } from "@/components/card-loading";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PluginCard, PluginDetail } from "./components";
import { CATEGORY_LABELS } from "./types";
import { useService } from "./use-service";

export function Marketplace() {
  const {
    search,
    setSearch,
    category,
    setCategory,
    categories,
    filter,
    setFilter,
    plugins,
    installedCount,
    isLoading,
    isError,
    refetch,
    installingName,
    uninstallingName,
    installResult,
    uninstallResult,
    onInstall,
    onUninstall,
    selectedPlugin,
    onSelectPlugin,
    projects,
    marketplaces,
    addSourceOpen,
    setAddSourceOpen,
    addSourceValue,
    setAddSourceValue,
    onAddMarketplace,
    isAddingMarketplace,
    addMarketplaceResult,
    onRemoveMarketplace,
    isRemovingMarketplace,
    onUpdateMarketplaces,
    isUpdatingMarketplaces,
  } = useService();

  const errorResult =
    (installResult && !installResult.success && installResult) ||
    (uninstallResult && !uninstallResult.success && uninstallResult);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Marketplace">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onUpdateMarketplaces}
            disabled={isUpdatingMarketplaces}
          >
            {isUpdatingMarketplaces ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 size-3.5" />
            )}
            Sync
          </Button>
          <Button size="sm" onClick={() => setAddSourceOpen(true)}>
            <Plus className="mr-1.5 size-3.5" />
            Add Source
          </Button>
        </div>
      </PageHeader>

      <div className="border-b px-6 py-3">
        <div className="mx-auto flex max-w-5xl flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search plugins..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                variant={filter === "installed" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFilter("installed")}
              >
                Installed
                {installedCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-4 min-w-4 px-1 text-[10px]"
                  >
                    {installedCount}
                  </Badge>
                )}
              </Button>
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant={category === "all" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCategory("all")}
              >
                All Categories
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={category === cat ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCategory(cat)}
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {errorResult && (
        <div className="border-b px-6 py-2">
          <p className="mx-auto max-w-5xl text-xs text-destructive">
            {errorResult.message}
          </p>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40">
        <div className="mx-auto max-w-5xl p-6">
          {isLoading && <CardLoading showTitle />}
          {isError && (
            <CardError
              message="Failed to load marketplace"
              onRetry={() => refetch()}
            />
          )}
          {!isLoading && !isError && plugins.length === 0 && (
            <CardEmpty
              message={
                filter === "installed"
                  ? "No installed plugins."
                  : "No plugins found. Try a different search or category."
              }
              icon={<Store className="size-8 text-muted-foreground" />}
            />
          )}
          {!isLoading && !isError && plugins.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {plugins.map((plugin) => (
                <PluginCard
                  key={`${plugin.name}@${plugin.marketplaceName}`}
                  plugin={plugin}
                  projects={projects}
                  installingName={installingName}
                  uninstallingName={uninstallingName}
                  onInstall={onInstall}
                  onUninstall={onUninstall}
                  onSelect={onSelectPlugin}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Plugin Detail Sheet */}
      <PluginDetail
        plugin={selectedPlugin}
        projects={projects}
        onClose={() => onSelectPlugin(null)}
        installingName={installingName}
        uninstallingName={uninstallingName}
        onInstall={onInstall}
        onUninstall={onUninstall}
      />

      {/* Add Marketplace Source Sheet */}
      <Sheet open={addSourceOpen} onOpenChange={setAddSourceOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Marketplace Sources</SheetTitle>
            <SheetDescription>
              Add or remove plugin marketplace sources.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4">
            <div className="flex gap-2">
              <Input
                placeholder="GitHub repo, URL, or path..."
                value={addSourceValue}
                onChange={(e) => setAddSourceValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isAddingMarketplace)
                    onAddMarketplace();
                }}
                disabled={isAddingMarketplace}
              />
              <Button
                onClick={onAddMarketplace}
                disabled={isAddingMarketplace || !addSourceValue.trim()}
                className="shrink-0"
              >
                {isAddingMarketplace ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
              </Button>
            </div>

            {addMarketplaceResult && !addMarketplaceResult.success && (
              <p className="text-xs text-destructive">
                {addMarketplaceResult.message}
              </p>
            )}

            <Separator />

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Configured Sources
              </p>
              {marketplaces.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No marketplace sources configured.
                </p>
              )}
              {marketplaces.map((m) => (
                <div
                  key={m.name}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {m.name}
                      </span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {m.pluginCount} plugins
                      </Badge>
                    </div>
                    {m.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {m.description}
                      </p>
                    )}
                    {m.ownerName && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {m.ownerName}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveMarketplace(m.name)}
                    disabled={isRemovingMarketplace}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setAddSourceOpen(false)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
