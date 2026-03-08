"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SkillsBridge } from "@/bridges/skills-bridge";

export function useService(onClose: () => void) {
  const queryClient = useQueryClient();
  const [pluginName, setPluginName] = useState("");

  const installMutation = useMutation({
    mutationFn: SkillsBridge.installSkill,
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
