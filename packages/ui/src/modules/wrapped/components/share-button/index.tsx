"use client";

import { Button } from "@/components/ui/button";
import { Download, Check, Copy } from "lucide-react";
import type { ShareButtonProps } from "./types";
import { useService } from "./use-service";

export function ShareButton({ targetRef }: ShareButtonProps) {
  const { saveState, copyState, handleSave, handleCopy } = useService({
    targetRef,
  });

  return (
    <div className="flex items-center gap-1.5">
      <Button
        onClick={handleCopy}
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={copyState === "working"}
      >
        {copyState === "done" ? (
          <>
            <Check className="size-3.5" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="size-3.5" />
            {copyState === "working" ? "Copying..." : "Copy"}
          </>
        )}
      </Button>
      <Button
        onClick={handleSave}
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={saveState === "working"}
      >
        {saveState === "done" ? (
          <>
            <Check className="size-3.5" />
            Saved!
          </>
        ) : (
          <>
            <Download className="size-3.5" />
            {saveState === "working" ? "Saving..." : "Save"}
          </>
        )}
      </Button>
    </div>
  );
}
