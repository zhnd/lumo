"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CardLoading } from "@/components/card-loading";
import { CardError } from "@/components/card-error";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { ArrowLeft, Pencil, Link2 } from "lucide-react";
import { useService } from "./use-service";
import type { SkillDetailViewProps } from "./types";

export function SkillDetailView({
  name,
  onBack,
  onEdit,
}: SkillDetailViewProps) {
  const { detail, isLoading, isError } = useService(name);

  if (isLoading) return <CardLoading showTitle />;
  if (isError || !detail) return <CardError message="Failed to load skill" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex flex-1 items-center gap-2">
          <h2 className="text-sm font-semibold">{detail.name}</h2>
          {detail.isSymlink && (
            <Link2 className="size-3.5 text-muted-foreground" />
          )}
          <Badge variant="outline" className="text-[10px]">
            v{detail.version}
          </Badge>
        </div>
        {!detail.isReadonly && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1.5 size-3.5" />
            Edit
          </Button>
        )}
      </div>

      {detail.description && (
        <p className="text-xs text-muted-foreground">{detail.description}</p>
      )}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            SKILL.md
          </span>
        </CardHeader>
        <CardContent className="p-4">
          <MarkdownViewer
            content={detail.markdownBody || "*No content*"}
            className="prose-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}
