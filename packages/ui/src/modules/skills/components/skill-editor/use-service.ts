"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SkillsBridge } from "@/bridges/skills-bridge";

export function useService(name: string) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["skill-detail", name],
    queryFn: () => SkillsBridge.getSkillDetail(name),
    enabled: !!name,
  });

  // Use local content if user has started editing, otherwise use fetched data
  const displayContent = content ?? detailQuery.data?.rawContent ?? "";

  const handleContentChange = useCallback((value: string) => {
    setContent(value);
  }, []);

  const saveMutation = useMutation({
    mutationFn: () => SkillsBridge.updateSkill(name, displayContent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-detail", name] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });

  return {
    content: displayContent,
    setContent: handleContentChange,
    isLoading: detailQuery.isLoading,
    isSaving: saveMutation.isPending,
    saveResult: saveMutation.data,
    saveError: saveMutation.error,
    onSave: saveMutation.mutate,
  };
}
