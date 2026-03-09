"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SkillsBridge } from "@/bridges/skills-bridge";

export function useService(onClose: () => void) {
  const queryClient = useQueryClient();

  // GitHub tab state
  const [githubSource, setGithubSource] = useState("");

  // Plugin tab state
  const [pluginName, setPluginName] = useState("");

  // Track which codex skill is being imported (by path)
  const [importingCodexPath, setImportingCodexPath] = useState<string | null>(
    null,
  );

  const codexSkillsQuery = useQuery({
    queryKey: ["codex-skills"],
    queryFn: SkillsBridge.listCodexSkills,
  });

  const invalidateAndClose = () => {
    queryClient.invalidateQueries({ queryKey: ["skills"] });
    onClose();
  };

  const githubInstallMutation = useMutation({
    mutationFn: (source: string) =>
      SkillsBridge.installSkillFromSource(source, false),
    onSuccess: (result) => {
      if (result.success) {
        setGithubSource("");
        invalidateAndClose();
      }
    },
  });

  const [failedCodexPath, setFailedCodexPath] = useState<string | null>(null);

  const codexImportMutation = useMutation({
    mutationFn: (path: string) =>
      SkillsBridge.installSkillFromSource(path, true),
    onMutate: (path) => {
      setImportingCodexPath(path);
      setFailedCodexPath(null);
    },
    onSuccess: (result, path) => {
      if (result.success) {
        setImportingCodexPath(null);
        invalidateAndClose();
      } else {
        setFailedCodexPath(path);
        setImportingCodexPath(null);
      }
    },
    onError: (_error, path) => {
      setFailedCodexPath(path);
      setImportingCodexPath(null);
    },
  });

  const pluginInstallMutation = useMutation({
    mutationFn: (name: string) => SkillsBridge.installSkill(name),
    onSuccess: (result) => {
      if (result.success) {
        setPluginName("");
        invalidateAndClose();
      }
    },
  });

  const handleGithubInstall = () => {
    const trimmed = githubSource.trim();
    if (trimmed) {
      githubInstallMutation.mutate(trimmed);
    }
  };

  const handleCodexImport = (path: string) => {
    codexImportMutation.mutate(path);
  };

  const handlePluginInstall = () => {
    const trimmed = pluginName.trim();
    if (trimmed) {
      pluginInstallMutation.mutate(trimmed);
    }
  };

  return {
    // GitHub
    githubSource,
    setGithubSource,
    isGithubInstalling: githubInstallMutation.isPending,
    githubInstallResult: githubInstallMutation.data,
    onGithubInstall: handleGithubInstall,

    // Codex
    codexSkills: codexSkillsQuery.data ?? [],
    isCodexLoading: codexSkillsQuery.isLoading,
    isCodexError: codexSkillsQuery.isError,
    importingCodexPath,
    failedCodexPath,
    codexImportResult: codexImportMutation.data,
    onCodexImport: handleCodexImport,

    // Plugin
    pluginName,
    setPluginName,
    isPluginInstalling: pluginInstallMutation.isPending,
    pluginInstallResult: pluginInstallMutation.data,
    onPluginInstall: handlePluginInstall,
  };
}
