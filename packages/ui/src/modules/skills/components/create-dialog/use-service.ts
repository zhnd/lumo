"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SkillsBridge } from "@/bridges/skills-bridge";
import type { SkillsScope } from "../../types";

export function useService(
  onClose: () => void,
  projectPath: SkillsScope,
  onCreated: (path: string) => void,
) {
  const queryClient = useQueryClient();
  const [skillName, setSkillName] = useState("");

  const createMutation = useMutation({
    mutationFn: (name: string) => SkillsBridge.createSkill(name, projectPath),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["skills"] });
        // result.message contains the created skill path
        const createdPath = result.message;
        setSkillName("");
        onClose();
        onCreated(createdPath);
      }
    },
  });

  const handleCreate = () => {
    const trimmed = skillName.trim();
    if (trimmed) {
      createMutation.mutate(trimmed);
    }
  };

  return {
    skillName,
    setSkillName,
    isCreating: createMutation.isPending,
    createResult: createMutation.data,
    onCreate: handleCreate,
  };
}
