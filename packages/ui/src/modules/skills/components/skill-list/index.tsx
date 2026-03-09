"use client";

import { Search } from "lucide-react";
import { CardEmpty } from "@/components/card-empty";
import { Input } from "@/components/ui/input";
import { SkillCard } from "../skill-card";
import type { SkillListProps } from "./types";
import { useService } from "./use-service";

export function SkillList({
  skills,
  onSelect,
  onUninstall,
  isUninstalling,
}: SkillListProps) {
  const { search, setSearch, filteredSkills } = useService(skills);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      {filteredSkills.length === 0 ? (
        <CardEmpty
          message="No skills match your search."
          icon={<Search className="size-8 text-muted-foreground" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.path}
              skill={skill}
              onSelect={onSelect}
              onUninstall={onUninstall}
              isUninstalling={isUninstalling}
            />
          ))}
        </div>
      )}
    </div>
  );
}
