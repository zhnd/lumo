"use client";

import { Button } from "@/components/ui/button";
import { CardLoading } from "@/components/card-loading";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useService } from "./use-service";
import type { SkillEditorProps } from "./types";

export function SkillEditor({ name, onDone, onBack }: SkillEditorProps) {
  const { content, setContent, isLoading, isSaving, onSave } =
    useService(name);

  if (isLoading) return <CardLoading showTitle />;

  const handleSave = () => {
    onSave(undefined, {
      onSuccess: (result) => {
        if (result.success) {
          onDone();
        }
      },
    });
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <h2 className="flex-1 text-sm font-semibold">Editing: {name}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
        <div className="flex flex-col overflow-hidden rounded-lg border border-border">
          <div className="border-b px-3 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Source
            </span>
          </div>
          <textarea
            className="flex-1 resize-none bg-muted/30 p-3 font-mono text-xs leading-relaxed outline-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col overflow-hidden rounded-lg border border-border">
          <div className="border-b px-3 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Preview
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <MarkdownViewer content={content} className="prose-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
