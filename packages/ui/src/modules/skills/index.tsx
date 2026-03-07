"use client";

import { PageHeader } from "@/components/page-header";
import { CardLoading } from "@/components/card-loading";
import { CardError } from "@/components/card-error";
import { SkillList, SkillDetailView, SkillEditor } from "./components";
import { useService } from "./use-service";
import { VIEW_MODE } from "./types";

export function Skills() {
  const {
    skills,
    isLoading,
    isError,
    refetch,
    selectedSkill,
    viewMode,
    onSelectSkill,
    onBack,
    onEdit,
    onEditDone,
    onUninstall,
    isUninstalling,
  } = useService();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Skills" />

      <div className="flex-1 overflow-y-auto bg-muted/40">
        <div className="mx-auto max-w-6xl p-6">
          {isLoading && <CardLoading showTitle />}
          {isError && (
            <CardError
              message="Failed to load skills"
              onRetry={() => refetch()}
            />
          )}
          {!isLoading && !isError && viewMode === VIEW_MODE.List && (
            <SkillList
              skills={skills}
              onSelect={onSelectSkill}
              onUninstall={onUninstall}
              isUninstalling={isUninstalling}
            />
          )}
          {viewMode === VIEW_MODE.Detail && selectedSkill && (
            <SkillDetailView
              name={selectedSkill}
              onBack={onBack}
              onEdit={onEdit}
            />
          )}
          {viewMode === VIEW_MODE.Edit && selectedSkill && (
            <SkillEditor
              name={selectedSkill}
              onDone={onEditDone}
              onBack={onBack}
            />
          )}
        </div>
      </div>
    </div>
  );
}
