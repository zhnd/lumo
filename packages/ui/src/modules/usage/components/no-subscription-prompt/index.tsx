"use client";

import { AlertCircle, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { NoSubscriptionPromptProps } from "./types";

export function NoSubscriptionPrompt({
  onSwitchAccount,
}: NoSubscriptionPromptProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-5 p-6">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <AlertCircle className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1.5 text-center">
            <p className="font-semibold">No active subscription</p>
            <p className="text-sm text-muted-foreground">
              Your account may not have a Claude Pro or Max plan, or usage data
              is currently unavailable.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={onSwitchAccount}
          >
            <ArrowRightLeft className="mr-2 size-4" />
            Switch account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
