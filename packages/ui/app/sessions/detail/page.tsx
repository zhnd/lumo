"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SessionDetail } from "@/modules/session-detail";
import { SessionDetailSkeleton } from "@/modules/session-detail/components";

function SessionDetailContent() {
  const searchParams = useSearchParams();
  const sessionPath = searchParams.get("path") || "";

  if (!sessionPath) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No session selected
      </div>
    );
  }

  return <SessionDetail sessionPath={sessionPath} />;
}

export default function SessionDetailPage() {
  return (
    <Suspense fallback={<SessionDetailSkeleton />}>
      <SessionDetailContent />
    </Suspense>
  );
}
