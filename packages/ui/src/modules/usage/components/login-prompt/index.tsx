"use client";

import { Terminal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function LoginPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-5 p-6">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
            <Terminal className="size-6 text-primary" />
          </div>
          <div className="space-y-1.5 text-center">
            <p className="font-semibold">Claude Code login required</p>
            <p className="text-sm text-muted-foreground">
              Run{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                claude login
              </code>{" "}
              in your terminal to authenticate, then refresh this page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
