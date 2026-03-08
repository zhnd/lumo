"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useService } from "./use-service";
import type { InstallDialogProps } from "./types";

export function InstallDialog({ open, onOpenChange }: InstallDialogProps) {
  const { pluginName, setPluginName, isInstalling, installResult, onInstall } =
    useService(() => onOpenChange(false));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Install Plugin</SheetTitle>
          <SheetDescription>
            Enter the plugin name to install via Claude CLI.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <Input
            placeholder="e.g. @anthropic/skill-name"
            value={pluginName}
            onChange={(e) => setPluginName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isInstalling) onInstall();
            }}
            disabled={isInstalling}
          />
          {installResult && !installResult.success && (
            <p className="mt-2 text-xs text-destructive">
              {installResult.message}
            </p>
          )}
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isInstalling}
          >
            Cancel
          </Button>
          <Button
            onClick={onInstall}
            disabled={isInstalling || !pluginName.trim()}
          >
            {isInstalling && (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            )}
            Install
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
