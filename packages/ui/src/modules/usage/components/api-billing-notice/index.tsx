"use client";

import { Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ApiBillingNotice() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-5 p-6">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
            <Receipt className="size-6 text-primary" />
          </div>
          <div className="space-y-2 text-center">
            <p className="font-semibold">Pay-as-you-go account</p>
            <p className="text-sm text-muted-foreground">
              This account uses pay-per-use API billing instead of a Claude
              subscription, so there are no fixed quotas to show. Check your
              provider's dashboard for spend and usage details.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
