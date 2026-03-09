"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MarketplaceBridge } from "@/bridges/marketplace-bridge";
import type { MarketplacePlugin } from "@/generated/typeshare-types";
import { useProjects } from "@/hooks/use-projects";

export type PluginFilter = "all" | "installed";

export function useService() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [filter, setFilter] = useState<PluginFilter>("all");
  const [installingName, setInstallingName] = useState<string | null>(null);
  const [uninstallingName, setUninstallingName] = useState<string | null>(null);
  const [selectedPlugin, setSelectedPlugin] =
    useState<MarketplacePlugin | null>(null);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [addSourceValue, setAddSourceValue] = useState("");

  const { projects } = useProjects();

  const pluginsQuery = useQuery({
    queryKey: ["marketplace-plugins"],
    queryFn: () => MarketplaceBridge.listPlugins(),
  });

  const marketplacesQuery = useQuery({
    queryKey: ["marketplaces"],
    queryFn: () => MarketplaceBridge.listMarketplaces(),
  });

  const invalidatePluginQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["skills"] });
    queryClient.invalidateQueries({ queryKey: ["marketplace-plugins"] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["global-skill-count"] });
  };

  const installMutation = useMutation({
    mutationFn: ({
      name,
      projectPath,
    }: {
      name: string;
      projectPath: string | null;
    }) => MarketplaceBridge.installPlugin(name, projectPath),
    onMutate: ({ name }) => {
      setInstallingName(name);
    },
    onSuccess: (result) => {
      if (result.success) {
        invalidatePluginQueries();
      }
      setInstallingName(null);
    },
    onError: () => {
      setInstallingName(null);
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: ({
      name,
      projectPath,
    }: {
      name: string;
      projectPath: string | null;
    }) => MarketplaceBridge.uninstallPlugin(name, projectPath),
    onMutate: ({ name }) => {
      setUninstallingName(name);
    },
    onSuccess: (result) => {
      if (result.success) {
        invalidatePluginQueries();
      }
      setUninstallingName(null);
    },
    onError: () => {
      setUninstallingName(null);
    },
  });

  const addMarketplaceMutation = useMutation({
    mutationFn: (source: string) => MarketplaceBridge.addMarketplace(source),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["marketplaces"] });
        queryClient.invalidateQueries({ queryKey: ["marketplace-plugins"] });
        setAddSourceOpen(false);
        setAddSourceValue("");
      }
    },
  });

  const removeMarketplaceMutation = useMutation({
    mutationFn: (name: string) => MarketplaceBridge.removeMarketplace(name),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["marketplaces"] });
        queryClient.invalidateQueries({ queryKey: ["marketplace-plugins"] });
      }
    },
  });

  const updateMarketplacesMutation = useMutation({
    mutationFn: () => MarketplaceBridge.updateMarketplaces(),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["marketplaces"] });
        queryClient.invalidateQueries({ queryKey: ["marketplace-plugins"] });
      }
    },
  });

  const plugins = pluginsQuery.data ?? [];

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of plugins) {
      if (p.category) cats.add(p.category);
    }
    return Array.from(cats).sort();
  }, [plugins]);

  const filtered = useMemo(() => {
    let list = plugins;
    if (filter === "installed") {
      list = list.filter((p) => p.installedScopes.length > 0);
    }
    if (category !== "all") {
      list = list.filter((p) => p.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [plugins, filter, category, search]);

  const installedCount = useMemo(
    () => plugins.filter((p) => p.installedScopes.length > 0).length,
    [plugins],
  );

  // Keep selectedPlugin in sync with fresh query data
  const resolvedSelectedPlugin = useMemo(() => {
    if (!selectedPlugin) return null;
    return (
      plugins.find((p) => p.name === selectedPlugin.name) ?? selectedPlugin
    );
  }, [selectedPlugin, plugins]);

  const handleInstall = (
    plugin: MarketplacePlugin,
    projectPath: string | null,
  ) => {
    installMutation.mutate({ name: plugin.name, projectPath });
  };

  const handleUninstall = (
    plugin: MarketplacePlugin,
    projectPath: string | null,
  ) => {
    uninstallMutation.mutate({ name: plugin.name, projectPath });
  };

  const handleAddMarketplace = () => {
    const trimmed = addSourceValue.trim();
    if (trimmed) {
      addMarketplaceMutation.mutate(trimmed);
    }
  };

  return {
    search,
    setSearch,
    category,
    setCategory,
    categories,
    filter,
    setFilter,
    plugins: filtered,
    installedCount,
    isLoading: pluginsQuery.isLoading,
    isError: pluginsQuery.isError,
    refetch: pluginsQuery.refetch,
    installingName,
    uninstallingName,
    installResult: installMutation.data,
    uninstallResult: uninstallMutation.data,
    onInstall: handleInstall,
    onUninstall: handleUninstall,
    // Detail
    selectedPlugin: resolvedSelectedPlugin,
    onSelectPlugin: setSelectedPlugin,
    // Projects (for scope selection in install/uninstall)
    projects,
    // Marketplace sources
    marketplaces: marketplacesQuery.data ?? [],
    isMarketplacesLoading: marketplacesQuery.isLoading,
    addSourceOpen,
    setAddSourceOpen,
    addSourceValue,
    setAddSourceValue,
    onAddMarketplace: handleAddMarketplace,
    isAddingMarketplace: addMarketplaceMutation.isPending,
    addMarketplaceResult: addMarketplaceMutation.data,
    onRemoveMarketplace: removeMarketplaceMutation.mutate,
    isRemovingMarketplace: removeMarketplaceMutation.isPending,
    onUpdateMarketplaces: () => updateMarketplacesMutation.mutate(),
    isUpdatingMarketplaces: updateMarketplacesMutation.isPending,
  };
}
