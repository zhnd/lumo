"use client";

import { CardEmpty } from "@/components/card-empty";
import { Puzzle } from "lucide-react";
import { SkillCard } from "../skill-card";
import type { SkillListProps } from "./types";

export function SkillList({
  skills,
  onSelect,
  onUninstall,
  isUninstalling,
}: SkillListProps) {
  if (skills.length === 0) {
    return (
      <CardEmpty
        message="No skills installed. Click 'Install Plugin' to add one."
        icon={<Puzzle className="size-8 text-muted-foreground" />}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
      {skills.map((skill) => (
        <SkillCard
          key={skill.path}
          skill={skill}
          onSelect={onSelect}
          onUninstall={onUninstall}
          isUninstalling={isUninstalling}
        />
      ))}
    </div>
  );
}
