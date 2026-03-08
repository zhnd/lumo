"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SkillsBridge } from "@/bridges/skills-bridge";
import { VIEW_MODE, type ViewMode } from "./types";

export function useService() {
  const queryClient = useQueryClient();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODE.List);

  const skillsQuery = useQuery({
    queryKey: ["skills"],
    queryFn: SkillsBridge.listSkills,
  });

  const uninstallMutation = useMutation({
    mutationFn: SkillsBridge.uninstallSkill,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["skills"] });
        setViewMode(VIEW_MODE.List);
        setSelectedSkill(null);
      }
    },
  });

  const handleSelectSkill = useCallback((name: string) => {
    setSelectedSkill(name);
    setViewMode(VIEW_MODE.Detail);
  }, []);

  const handleBack = useCallback(() => {
    setViewMode(VIEW_MODE.List);
    setSelectedSkill(null);
  }, []);

  const handleEdit = useCallback(() => {
    setViewMode(VIEW_MODE.Edit);
  }, []);

  const handleEditDone = useCallback(() => {
    setViewMode(VIEW_MODE.Detail);
  }, []);

  return {
    skills: skillsQuery.data ?? [],
    isLoading: skillsQuery.isLoading,
    isError: skillsQuery.isError,
    refetch: skillsQuery.refetch,
    selectedSkill,
    viewMode,
    onSelectSkill: handleSelectSkill,
    onBack: handleBack,
    onEdit: handleEdit,
    onEditDone: handleEditDone,
    onUninstall: uninstallMutation.mutate,
    isUninstalling: uninstallMutation.isPending,
  };
}
