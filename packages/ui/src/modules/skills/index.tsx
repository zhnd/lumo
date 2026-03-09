"use client";

import { Plus, Puzzle } from "lucide-react";
import { useRouter } from "next/navigation";
import { CardEmpty } from "@/components/card-empty";
import { CardError } from "@/components/card-error";
import { CardLoading } from "@/components/card-loading";
import { PageHeader } from "@/components/page-header";
import { ScopeSelector } from "@/components/scope-selector";
import { Button } from "@/components/ui/button";
import {
  AddSkillDialog,
  CreateDialog,
  DeleteSkillDialog,
  SkillList,
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
    isAddDialogOpen,
    setIsAddDialogOpen,
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
        <Button
          className="cursor-pointer"
          size="sm"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="size-4" />
          Add Skill
        </Button>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-1.5 size-3.5" />
          New Skill
        </Button>
      </PageHeader>

      <div className="border-b px-6 py-3">
        <div className="mx-auto max-w-5xl">
          <ScopeSelector
            projects={projects}
            value={scope}
            onChange={onScopeChange}
            counts={skillCounts}
            globalCount={globalCount}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40">
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
              message="No skills found. Create a new skill or install plugins from the Marketplace."
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

      <AddSkillDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
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
