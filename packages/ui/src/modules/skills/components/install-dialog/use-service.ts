"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SkillsBridge } from "@/bridges/skills-bridge";
import type { SkillsScope } from "../../types";

export function useService(onClose: () => void, projectPath: SkillsScope) {
  const queryClient = useQueryClient();
  const [pluginName, setPluginName] = useState("");

  const installMutation = useMutation({
    mutationFn: (name: string) => SkillsBridge.installSkill(name, projectPath),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["skills"] });
        setPluginName("");
        onClose();
      }
    },
  });

  const handleInstall = () => {
    const trimmed = pluginName.trim();
    if (trimmed) {
      installMutation.mutate(trimmed);
    }
  };

  return {
    pluginName,
    setPluginName,
    isInstalling: installMutation.isPending,
    installResult: installMutation.data,
    installError: installMutation.error,
    onInstall: handleInstall,
  };
}
