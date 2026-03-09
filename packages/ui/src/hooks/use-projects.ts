"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ProjectsBridge } from "@/bridges/projects-bridge";
import { watcherBackedQueryOptions } from "@/lib/query-options";

export function useProjects() {
  const projectsQuery = useQuery({
    ...watcherBackedQueryOptions,
    queryKey: ["projects"],
    queryFn: () => ProjectsBridge.getProjects(),
  });

  const projects = useMemo(
    () => projectsQuery.data ?? [],
    [projectsQuery.data],
  );

  return {
    projects,
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
    refetch: projectsQuery.refetch,
  };
}
