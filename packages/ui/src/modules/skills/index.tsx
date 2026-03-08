"use client";

import { useRouter } from "next/navigation";
import { Globe, Puzzle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CardLoading } from "@/components/card-loading";
import { CardError } from "@/components/card-error";
import { CardEmpty } from "@/components/card-empty";
import { ProjectNav } from "@/components/project-nav";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import {
  SkillList,
  InstallDialog,
  CreateDialog,
  DeleteSkillDialog,
} from "./components";
import { useService } from "./use-service";

export function Skills() {
  const router = useRouter();
  const {
    skills,
    isLoading,
    isError,
    refetch,
    projects,
    scope,
    onScopeChange,
    onRequestDelete,
    onConfirmDelete,
    pendingDelete,
    setPendingDelete,
    isUninstalling,
    skillCounts,
    globalCount,
    installDialogOpen,
    setInstallDialogOpen,
    createDialogOpen,
    setCreateDialogOpen,
  } = useService();

  const handleSelectSkill = (path: string) => {
    const encodedPath = encodeURIComponent(path);
    router.push(`/skills/detail?path=${encodedPath}`);
  };

  const handleCreated = (createdPath: string) => {
    handleSelectSkill(createdPath);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Skills">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInstallDialogOpen(true)}
          >
            <Download className="mr-1.5 size-3.5" />
            Install Plugin
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-1.5 size-3.5" />
            New Skill
          </Button>
        </div>
      </PageHeader>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <ProjectNav
          projects={projects}
          selected={scope}
          onSelect={onScopeChange}
          allLabel="Global"
          allIcon={<Globe className="size-4 text-muted-foreground" />}
          allBadge={globalCount}
          counts={skillCounts}
        />

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-muted/40">
          <div className="mx-auto max-w-5xl p-6">
            {isLoading && <CardLoading showTitle />}
            {isError && (
              <CardError
                message="Failed to load skills"
                onRetry={() => refetch()}
              />
            )}
            {!isLoading && !isError && skills.length === 0 && (
              <CardEmpty
                message="No skills installed. Click 'Install Plugin' to add one."
                icon={<Puzzle className="size-8 text-muted-foreground" />}
              />
            )}
            {!isLoading && !isError && skills.length > 0 && (
              <SkillList
                skills={skills}
                onSelect={handleSelectSkill}
                onUninstall={onRequestDelete}
                isUninstalling={isUninstalling}
              />
            )}
          </div>
        </div>
      </div>

      <InstallDialog
        open={installDialogOpen}
        onOpenChange={setInstallDialogOpen}
        projectPath={scope}
      />
      <CreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectPath={scope}
        onCreated={handleCreated}
      />
      <DeleteSkillDialog
        skillName={pendingDelete?.name ?? null}
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
