"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CreateDialogProps } from "./types";
import { useService } from "./use-service";

export function CreateDialog({
  open,
  onOpenChange,
  projectPath,
  onCreated,
}: CreateDialogProps) {
  const { skillName, setSkillName, isCreating, createResult, onCreate } =
    useService(() => onOpenChange(false), projectPath, onCreated);

  const scopeLabel = projectPath ? "project" : "global (~/.claude/skills/)";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New Skill</SheetTitle>
          <SheetDescription>
            Create a new skill with a template SKILL.md ({scopeLabel}).
          </SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <Input
            placeholder="e.g. my-custom-skill"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isCreating) onCreate();
            }}
            disabled={isCreating}
          />
          {createResult && !createResult.success && (
            <p className="mt-2 text-xs text-destructive">
              {createResult.message}
            </p>
          )}
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={isCreating || !skillName.trim()}>
            {isCreating && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Create
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
