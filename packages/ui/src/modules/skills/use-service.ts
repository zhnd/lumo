"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { ProjectsBridge } from "@/bridges/projects-bridge";
import { SkillsBridge } from "@/bridges/skills-bridge";
import { useProjects } from "@/hooks/use-projects";
import type { SkillsScope } from "./types";

export function useService() {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<SkillsScope>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    path: string;
    name: string;
  } | null>(null);

  const { projects } = useProjects();

  const globalCountQuery = useQuery({
    queryKey: ["global-skill-count"],
    queryFn: () => ProjectsBridge.getGlobalSkillCount(),
  });

  const skillsQuery = useQuery({
    queryKey: ["skills", scope],
    queryFn: () => SkillsBridge.listSkills(scope),
  });

  const uninstallMutation = useMutation({
    mutationFn: SkillsBridge.uninstallSkill,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["skills", scope] });
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["global-skill-count"] });
        setPendingDelete(null);
      }
    },
  });

  const handleRequestDelete = useCallback(
    (path: string) => {
      const skill = skillsQuery.data?.find((s) => s.path === path);
      setPendingDelete({ path, name: skill?.name ?? path });
    },
    [skillsQuery.data],
  );

  const handleConfirmDelete = useCallback(() => {
    if (pendingDelete) {
      uninstallMutation.mutate(pendingDelete.path);
    }
  }, [pendingDelete, uninstallMutation]);

  const handleScopeChange = useCallback((newScope: SkillsScope) => {
    setScope(newScope);
  }, []);

  const skillCounts = useMemo(
    () =>
      Object.fromEntries(projects.map((p) => [p.projectPath, p.skillCount])),
    [projects],
  );
  const globalCount = globalCountQuery.data ?? 0;

  return {
    skills: skillsQuery.data ?? [],
    isLoading: skillsQuery.isLoading,
    isError: skillsQuery.isError,
    refetch: skillsQuery.refetch,
    projects,
    scope,
    onScopeChange: handleScopeChange,
    skillCounts,
    globalCount,
    onRequestDelete: handleRequestDelete,
    onConfirmDelete: handleConfirmDelete,
    pendingDelete,
    setPendingDelete,
    isUninstalling: uninstallMutation.isPending,
    isAddDialogOpen,
    setIsAddDialogOpen,
    createDialogOpen,
    setCreateDialogOpen,
  };
}
