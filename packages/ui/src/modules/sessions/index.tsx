"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { CardError } from "@/components/card-error";
import { PageHeader } from "@/components/page-header";
import { ProjectNav } from "@/components/project-nav";
import { Button } from "@/components/ui/button";
import {
  ProjectListSkeleton,
  SessionList,
  SessionListSkeleton,
} from "./components";
import type { ClaudeSession } from "./types";
import { useService } from "./use-service";

export function Sessions() {
  const router = useRouter();
  const {
    filteredSessions,
    projects,
    selectedProjectPath,
    setSelectedProjectPath,
    selectedProjectName,
    totalSessions,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refetch,
  } = useService();

  const handleSelectSession = (session: ClaudeSession) => {
    // Use query parameter for session path
    const encodedPath = encodeURIComponent(session.fullPath);
    router.push(`/sessions/detail?path=${encodedPath}`);
  };

  return (
    <>
      <PageHeader
        title={`${selectedProjectName} (${filteredSessions.length}/${totalSessions})`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </PageHeader>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {isLoading ? (
          <>
            <ProjectListSkeleton />
            <div className="min-h-0 flex-1">
              <SessionListSkeleton />
            </div>
          </>
        ) : error ? (
          <CardError
            message="Failed to load sessions"
            onRetry={refetch}
            className="m-4 w-full"
          />
        ) : (
          <>
            <ProjectNav
              projects={projects}
              selected={selectedProjectPath}
              onSelect={setSelectedProjectPath}
              allBadge={totalSessions}
              counts={Object.fromEntries(
                projects.map((p) => [p.projectPath, p.sessionCount]),
              )}
            />
            <div className="min-h-0 min-w-0 flex-1">
              <SessionList
                sessions={filteredSessions}
                onSelectSession={handleSelectSession}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={loadMore}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
