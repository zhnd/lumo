"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CardLoading } from "@/components/card-loading";
import { SkillDetail } from "@/modules/skill-detail";

function SkillDetailContent() {
  const searchParams = useSearchParams();
  const skillPath = searchParams.get("path") || "";

  if (!skillPath) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No skill selected
      </div>
    );
  }

  return <SkillDetail skillPath={skillPath} />;
}

export default function SkillDetailPage() {
  return (
    <Suspense fallback={<CardLoading showTitle />}>
      <SkillDetailContent />
    </Suspense>
  );
}
