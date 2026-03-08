"use client";

import { useQuery } from "@tanstack/react-query";
import { SkillsBridge } from "@/bridges/skills-bridge";

export function useService(name: string) {
  const detailQuery = useQuery({
    queryKey: ["skill-detail", name],
    queryFn: () => SkillsBridge.getSkillDetail(name),
    enabled: !!name,
  });

  return {
    detail: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
  };
}
