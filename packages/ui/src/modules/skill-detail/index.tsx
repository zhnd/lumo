"use client";

import {
  Bot,
  GitFork,
  Link2,
  Loader2,
  Save,
  Terminal,
  Trash2,
  Undo2,
  Wrench,
} from "lucide-react";
import { CardError } from "@/components/card-error";
import { CardLoading } from "@/components/card-loading";
import { CodeEditor } from "@/components/code-editor";
import { DetailHeader } from "@/components/detail-header";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkillScope } from "@/generated/typeshare-types";
import { DeleteSkillDialog } from "@/modules/skills/components/delete-dialog";
import type { SkillDetailProps } from "./types";
import { useService } from "./use-service";

export function SkillDetail({ skillPath }: SkillDetailProps) {
  const {
    detail,
    isLoading,
    isError,
    content,
    setContent,
    isDirty,
    isSaving,
    onSave,
    onDiscard,
    isUninstalling,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    onDeleteConfirm,
    onBack,
    metaBadges,
    sourceRef,
    previewRef,
    onScrollSync,
  } = useService(skillPath);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <DetailHeader title="Loading..." onBack={onBack} />
        <div className="p-6">
          <CardLoading showTitle />
        </div>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="flex h-full flex-col">
        <DetailHeader title="Error" onBack={onBack} />
        <div className="p-6">
          <CardError message="Failed to load skill" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <DetailHeader
        title={detail.name}
        subtitle={detail.description || undefined}
        onBack={onBack}
        badges={
          <>
            {detail.scope === SkillScope.Legacy && (
              <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
                <Terminal className="size-3" />
                Legacy
              </Badge>
            )}
            {detail.version && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                v{detail.version}
              </Badge>
            )}
            {detail.isSymlink && (
              <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                <Link2 className="size-3" />
                Symlink
              </Badge>
            )}
          </>
        }
        actions={
          <>
            {isDirty && (
              <>
                <Button variant="ghost" size="sm" onClick={onDiscard}>
                  <Undo2 className="mr-1.5 size-3.5" />
                  Discard
                </Button>
                <Button size="sm" onClick={() => onSave()} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 size-3.5" />
                  )}
                  Save
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={isUninstalling}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        }
        meta={
          metaBadges.length > 0
            ? metaBadges.map((badge) => (
                <Badge
                  key={badge.label}
                  variant="secondary"
                  className="gap-1 text-[10px]"
                >
                  {badge.icon === "model" && <Bot className="size-3" />}
                  {badge.icon === "tool" && <Wrench className="size-3" />}
                  {badge.icon === "context" && <GitFork className="size-3" />}
                  {badge.label}
                </Badge>
              ))
            : undefined
        }
      />

      {detail.isReadonly ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl">
            <MarkdownViewer
              content={detail.markdownBody || "*No content*"}
              className="prose-sm"
            />
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-2">
          <div className="flex flex-col overflow-hidden border-r">
            <div className="border-b px-3 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Source
              </span>
            </div>
            <div
              ref={sourceRef}
              className="flex-1 overflow-auto bg-muted/30"
              onScroll={() => onScrollSync("source")}
            >
              <CodeEditor value={content} onChange={setContent} />
            </div>
          </div>
          <div className="flex flex-col overflow-hidden">
            <div className="border-b px-3 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Preview
              </span>
            </div>
            <div
              ref={previewRef}
              className="flex-1 overflow-y-auto p-4"
              onScroll={() => onScrollSync("preview")}
            >
              <MarkdownViewer content={content} className="prose-sm" />
            </div>
          </div>
        </div>
      )}

      <DeleteSkillDialog
        skillName={detail.name}
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}
