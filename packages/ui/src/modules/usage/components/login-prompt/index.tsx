"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LoginPromptProps } from "./types";

export function LoginPrompt({ onLogin, isLoading }: LoginPromptProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-5 p-6">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
            <ExternalLink className="size-6 text-primary" />
          </div>
          <div className="space-y-1.5 text-center">
            <p className="font-semibold">Connect to Claude</p>
            <p className="text-sm text-muted-foreground">
              Sign in to your Claude account to view your subscription usage and
              limits.
            </p>
          </div>
          <Button className="w-full" onClick={onLogin} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 size-4" />
            )}
            {isLoading ? "Waiting for login..." : "Sign in to claude.ai"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
