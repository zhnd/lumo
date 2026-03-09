"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { SkillsBridge } from "@/bridges/skills-bridge";

export function useService(skillPath: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editContent, setEditContent] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["skill-detail", skillPath],
    queryFn: () => SkillsBridge.getSkillDetail(skillPath),
    enabled: !!skillPath,
  });

  const detail = detailQuery.data ?? null;
  const displayContent = editContent ?? detail?.rawContent ?? "";
  const isDirty =
    editContent !== null && editContent !== (detail?.rawContent ?? "");

  const handleContentChange = useCallback((value: string) => {
    setEditContent(value);
  }, []);

  const saveMutation = useMutation({
    mutationFn: () => SkillsBridge.updateSkill(skillPath, displayContent),
    onSuccess: () => {
      setEditContent(null);
      queryClient.invalidateQueries({ queryKey: ["skill-detail", skillPath] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: () => SkillsBridge.uninstallSkill(skillPath),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["skills"] });
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["global-skill-count"] });
        router.push("/skills");
      }
    },
  });

  const handleDiscard = useCallback(() => {
    setEditContent(null);
  }, []);

  const handleBack = useCallback(() => {
    router.push("/skills");
  }, [router]);

  const handleDeleteConfirm = useCallback(() => {
    setDeleteConfirmOpen(false);
    uninstallMutation.mutate();
  }, [uninstallMutation]);

  // Scroll sync
  const sourceRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  const handleScrollSync = useCallback((source: "source" | "preview") => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;

    const from = source === "source" ? sourceRef.current : previewRef.current;
    const to = source === "source" ? previewRef.current : sourceRef.current;

    if (from && to) {
      const maxScroll = from.scrollHeight - from.clientHeight;
      const ratio = maxScroll > 0 ? from.scrollTop / maxScroll : 0;
      to.scrollTop = ratio * (to.scrollHeight - to.clientHeight);
    }

    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, []);

  const metaBadges = useMemo(() => {
    if (!detail) return [];
    const items: {
      label: string;
      icon: "model" | "tool" | "context" | "flag";
    }[] = [];
    if (detail.model) items.push({ label: detail.model, icon: "model" });
    if (detail.allowedTools)
      items.push({ label: detail.allowedTools, icon: "tool" });
    if (detail.skillContext === "fork")
      items.push({
        label: `Fork${detail.agent ? `: ${detail.agent}` : ""}`,
        icon: "context",
      });
    if (detail.argumentHint)
      items.push({ label: detail.argumentHint, icon: "flag" });
    if (detail.disableModelInvocation)
      items.push({ label: "User-only", icon: "flag" });
    if (!detail.userInvocable)
      items.push({ label: "Model-only", icon: "flag" });
    return items;
  }, [detail]);

  return {
    detail,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    content: displayContent,
    setContent: handleContentChange,
    isDirty,
    isSaving: saveMutation.isPending,
    onSave: saveMutation.mutate,
    onDiscard: handleDiscard,
    isUninstalling: uninstallMutation.isPending,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    onDeleteConfirm: handleDeleteConfirm,
    onBack: handleBack,
    metaBadges,
    sourceRef,
    previewRef,
    onScrollSync: handleScrollSync,
  };
}
