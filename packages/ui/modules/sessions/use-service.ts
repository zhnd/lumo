"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClaudeSessionBridge } from "@/src/bridges/claude-session-bridge";
import { watcherBackedQueryOptions } from "@/src/lib/query-options";
import { useTauriEvent } from "@/hooks/use-tauri-event";
import type { UseServiceReturn } from "./types";

const PAGE_SIZE = 20;

export function useService(): UseServiceReturn {
  const queryClient = useQueryClient();
  const [selectedProjectPath, setSelectedProjectPath] = useState<string | null>(null);
  const [hasManualSelection, setHasManualSelection] = useState(false);
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateSessions = useCallback(() => {
    if (invalidateTimerRef.current) {
      clearTimeout(invalidateTimerRef.current);
    }

    invalidateTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["claude-projects"] });
      queryClient.invalidateQueries({ queryKey: ["claude-sessions-page"] });
      invalidateTimerRef.current = null;
    }, 300);
  }, [queryClient]);

  useTauriEvent("sessions-list-changed", invalidateSessions);

  useEffect(() => {
    return () => {
      if (invalidateTimerRef.current) {
        clearTimeout(invalidateTimerRef.current);
      }
    };
  }, []);

  const projectsQuery = useQuery({
    ...watcherBackedQueryOptions,
    queryKey: ["claude-projects"],
    queryFn: () => ClaudeSessionBridge.getProjects(),
  });

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const effectiveSelectedProjectPath = hasManualSelection
    ? selectedProjectPath
    : (projects[0]?.projectPath ?? null);

  const sessionsQuery = useInfiniteQuery({
    ...watcherBackedQueryOptions,
    queryKey: ["claude-sessions-page", effectiveSelectedProjectPath],
    enabled: hasManualSelection || projects.length > 0,
    queryFn: ({ pageParam = 0 }) =>
      ClaudeSessionBridge.getSessionsPage(
        effectiveSelectedProjectPath,
        pageParam,
        PAGE_SIZE,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.sessions.length : undefined,
  });

  const sessions = useMemo(
    () =>
      sessionsQuery.data?.pages.flatMap((page) => page.sessions) ?? [],
    [sessionsQuery.data],
  );

  const filteredSessions = useMemo(() => sessions, [sessions]);

  const selectedProjectName = useMemo(() => {
    if (!effectiveSelectedProjectPath) return "All Projects";
    return (
      projects.find((p) => p.projectPath === effectiveSelectedProjectPath)?.projectName ??
      "Project"
    );
  }, [projects, effectiveSelectedProjectPath]);

  const totalSessions = useMemo(() => {
    if (effectiveSelectedProjectPath) {
      return (
        projects.find((p) => p.projectPath === effectiveSelectedProjectPath)?.sessionCount ??
        sessionsQuery.data?.pages[0]?.totalCount ??
        sessions.length
      );
    }
    const byProject = projects.reduce((sum, p) => sum + p.sessionCount, 0);
    return byProject > 0 ? byProject : (sessionsQuery.data?.pages[0]?.totalCount ?? sessions.length);
  }, [projects, effectiveSelectedProjectPath, sessionsQuery.data, sessions.length]);

  const isLoading =
    projectsQuery.isLoading ||
    (projects.length === 0 && !projectsQuery.data) ||
    sessionsQuery.isLoading;

  const error = (projectsQuery.error || sessionsQuery.error) as Error | null;

  return {
    sessions,
    filteredSessions,
    projects,
    selectedProjectPath: effectiveSelectedProjectPath,
    setSelectedProjectPath: (projectPath) => {
      setHasManualSelection(true);
      setSelectedProjectPath(projectPath);
    },
    totalSessions,
    selectedProjectName,
    isLoading,
    isLoadingMore: sessionsQuery.isFetchingNextPage,
    hasMore: sessionsQuery.hasNextPage ?? false,
    error,
    loadMore: () => {
      if (!sessionsQuery.hasNextPage || sessionsQuery.isFetchingNextPage) {
        return;
      }
      void sessionsQuery.fetchNextPage();
    },
    refetch: () => {
      projectsQuery.refetch();
      sessionsQuery.refetch();
    },
  };
}
