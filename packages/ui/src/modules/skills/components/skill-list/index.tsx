"use client";

import { SkillCard } from "../skill-card";
import type { SkillListProps } from "./types";

export function SkillList({
  skills,
  onSelect,
  onUninstall,
  isUninstalling,
}: SkillListProps) {
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
