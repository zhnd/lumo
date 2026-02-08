"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClaudeSessionBridge } from "@/src/bridges/claude-session-bridge";
import type { UseServiceReturn } from "./types";

export function useService(): UseServiceReturn {
  const [selectedProjectPath, setSelectedProjectPath] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: ["claude-projects"],
    queryFn: () => ClaudeSessionBridge.getProjects(),
  });

  const allSessionsQuery = useQuery({
    queryKey: ["claude-sessions"],
    queryFn: () => ClaudeSessionBridge.getAllSessions(),
  });

  const projectSessionsQuery = useQuery({
    queryKey: ["claude-sessions-by-project", selectedProjectPath],
    queryFn: () => ClaudeSessionBridge.getSessionsForProject(selectedProjectPath as string),
    enabled: !!selectedProjectPath,
  });

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  const sessions = useMemo(
    () =>
      selectedProjectPath
        ? projectSessionsQuery.data ?? []
        : allSessionsQuery.data ?? [],
    [selectedProjectPath, projectSessionsQuery.data, allSessionsQuery.data],
  );

  const filteredSessions = useMemo(() => sessions, [sessions]);

  const selectedProjectName = useMemo(() => {
    if (!selectedProjectPath) return "All Projects";
    return projects.find((p) => p.projectPath === selectedProjectPath)?.projectName ?? "Project";
  }, [projects, selectedProjectPath]);

  const totalSessions = useMemo(() => {
    const byProject = projects.reduce((sum, p) => sum + p.sessionCount, 0);
    return byProject > 0 ? byProject : (allSessionsQuery.data ?? []).length;
  }, [projects, allSessionsQuery.data]);

  const isLoading =
    projectsQuery.isLoading ||
    allSessionsQuery.isLoading ||
    (!!selectedProjectPath && projectSessionsQuery.isLoading);

  const error = (projectsQuery.error ||
    allSessionsQuery.error ||
    projectSessionsQuery.error) as Error | null;

  return {
    sessions,
    filteredSessions,
    projects,
    selectedProjectPath,
    setSelectedProjectPath,
    totalSessions,
    selectedProjectName,
    isLoading,
    error,
    refetch: () => {
      projectsQuery.refetch();
      allSessionsQuery.refetch();
      if (selectedProjectPath) {
        projectSessionsQuery.refetch();
      }
    },
  };
}
