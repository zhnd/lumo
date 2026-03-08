"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link2, Trash2, Terminal } from "lucide-react";
import { SkillScope } from "@/generated/typeshare-types";
import type { SkillCardProps } from "./types";

export function SkillCard({
  skill,
  onSelect,
  onUninstall,
  isUninstalling,
}: SkillCardProps) {
  return (
    <Card
      className="group cursor-pointer gap-3 py-4 transition-colors hover:bg-accent/50"
      onClick={() => onSelect(skill.path)}
    >
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {skill.scope === SkillScope.Legacy && (
                <Terminal className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <CardTitle className="truncate text-sm">{skill.name}</CardTitle>
              {skill.isSymlink && (
                <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {skill.scope === SkillScope.Legacy && (
              <Badge variant="secondary" className="text-[10px]">
                Legacy
              </Badge>
            )}
            {skill.version && (
              <Badge variant="outline" className="text-[10px]">
                v{skill.version}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {skill.description || "No description"}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {skill.source && (
              <Badge variant="secondary" className="text-[10px]">
                {skill.source}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onUninstall(skill.path);
            }}
            disabled={isUninstalling}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
