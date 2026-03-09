"use client";

import { FolderInput, Github, Loader2, Plug } from "lucide-react";
import { CardEmpty } from "@/components/card-empty";
import { CardError } from "@/components/card-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AddSkillDialogProps } from "./types";
import { useService } from "./use-service";

export function AddSkillDialog({ open, onOpenChange }: AddSkillDialogProps) {
  const {
    githubSource,
    setGithubSource,
    isGithubInstalling,
    githubInstallResult,
    onGithubInstall,
    codexSkills,
    isCodexLoading,
    isCodexError,
    importingCodexPath,
    failedCodexPath,
    codexImportResult,
    onCodexImport,
    pluginName,
    setPluginName,
    isPluginInstalling,
    pluginInstallResult,
    onPluginInstall,
  } = useService(() => onOpenChange(false));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add Skill</SheetTitle>
          <SheetDescription>
            Install a skill from GitHub, import from Codex, or use Claude Plugin
            CLI.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col px-4">
          <Tabs defaultValue="codex" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="w-full shrink-0">
              <TabsTrigger value="codex">
                <FolderInput className="size-3.5" />
                Codex
              </TabsTrigger>
              <TabsTrigger value="plugin">
                <Plug className="size-3.5" />
                Plugin
              </TabsTrigger>
              <TabsTrigger value="github">
                <Github className="size-3.5" />
                GitHub
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="github"
              className="mt-4 space-y-3 overflow-y-auto"
            >
              <p className="text-xs text-muted-foreground">
                Enter a GitHub repository (e.g. owner/repo or
                owner/repo/skills/name) to install via{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                  npx skills
                </code>
                .
              </p>
              <Input
                placeholder="e.g. anthropics/skills"
                value={githubSource}
                onChange={(e) => setGithubSource(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isGithubInstalling) {
                    onGithubInstall();
                  }
                }}
                disabled={isGithubInstalling}
              />
              {githubInstallResult && !githubInstallResult.success && (
                <p className="text-xs text-destructive">
                  {githubInstallResult.message}
                </p>
              )}
              <Button
                onClick={onGithubInstall}
                disabled={isGithubInstalling || !githubSource.trim()}
                className="w-full"
                size="sm"
              >
                {isGithubInstalling && (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                )}
                Install from GitHub
              </Button>
            </TabsContent>

            <TabsContent
              value="codex"
              className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto"
            >
              <p className="text-xs text-muted-foreground">
                Import skills from{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                  ~/.agents/skills/
                </code>{" "}
                into Claude Code.
              </p>
              {isCodexLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isCodexLoading && isCodexError && (
                <CardError message="Failed to load Codex skills from ~/.agents/skills/" />
              )}
              {!isCodexLoading && !isCodexError && codexSkills.length === 0 && (
                <CardEmpty
                  message="No Codex skills found in ~/.agents/skills/"
                  icon={
                    <FolderInput className="size-8 text-muted-foreground" />
                  }
                />
              )}
              {!isCodexLoading &&
                codexSkills.map((skill) => {
                  const isImporting = importingCodexPath === skill.path;
                  return (
                    <Card key={skill.path} className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {skill.name}
                          </p>
                          {skill.description && (
                            <p className="truncate text-xs text-muted-foreground">
                              {skill.description}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCodexImport(skill.path)}
                          disabled={importingCodexPath !== null}
                        >
                          {isImporting && (
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          )}
                          Import
                        </Button>
                      </div>
                      {failedCodexPath === skill.path &&
                        codexImportResult &&
                        !codexImportResult.success && (
                          <p className="mt-2 text-xs text-destructive">
                            {codexImportResult.message}
                          </p>
                        )}
                    </Card>
                  );
                })}
            </TabsContent>

            <TabsContent
              value="plugin"
              className="mt-4 space-y-3 overflow-y-auto"
            >
              <p className="text-xs text-muted-foreground">
                Install a plugin via{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                  claude plugin install
                </code>
                .
              </p>
              <Input
                placeholder="e.g. @anthropic/skill-name"
                value={pluginName}
                onChange={(e) => setPluginName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isPluginInstalling) {
                    onPluginInstall();
                  }
                }}
                disabled={isPluginInstalling}
              />
              {pluginInstallResult && !pluginInstallResult.success && (
                <p className="text-xs text-destructive">
                  {pluginInstallResult.message}
                </p>
              )}
              <Button
                onClick={onPluginInstall}
                disabled={isPluginInstalling || !pluginName.trim()}
                className="w-full"
                size="sm"
              >
                {isPluginInstalling && (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                )}
                Install Plugin
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
