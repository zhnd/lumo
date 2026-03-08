import { useMemo, useState } from "react";
import type { SkillSummary } from "@/generated/typeshare-types";

export function useService(skills: SkillSummary[]) {
  const [search, setSearch] = useState("");

  const filteredSkills = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return skills;
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query),
    );
  }, [skills, search]);

  return { search, setSearch, filteredSkills };
}
