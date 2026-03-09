"use client";

import { FolderOpen, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScopeSelectorProps } from "./types";

const GLOBAL_VALUE = "__global__";

export function ScopeSelector({
  projects,
  value,
  onChange,
  counts,
  globalCount,
}: ScopeSelectorProps) {
  const selectValue = value ?? GLOBAL_VALUE;

  const handleChange = (val: string) => {
    onChange(val === GLOBAL_VALUE ? null : val);
  };

  return (
    <Select value={selectValue} onValueChange={handleChange}>
      <SelectTrigger size="sm">
        <SelectValue>
          {value === null ? (
            <>
              <Globe className="size-3.5" />
              <span>Global</span>
            </>
          ) : (
            <>
              <FolderOpen className="size-3.5" />
              <span className="max-w-40 truncate">
                {projects.find((p) => p.projectPath === value)?.projectName ??
                  value}
              </span>
            </>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={GLOBAL_VALUE}>
          <Globe className="size-3.5" />
          <span>Global</span>
          {globalCount != null && (
            <Badge
              variant="secondary"
              className="ml-auto h-4 px-1.5 text-[10px]"
            >
              {globalCount}
            </Badge>
          )}
        </SelectItem>
        {projects.length > 0 && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Projects</SelectLabel>
              {projects.map((project) => {
                const count = counts?.[project.projectPath];
                return (
                  <SelectItem
                    key={project.projectPath}
                    value={project.projectPath}
                  >
                    <FolderOpen className="size-3.5" />
                    <span className="max-w-48 truncate">
                      {project.projectName}
                    </span>
                    {count != null && (
                      <Badge
                        variant="secondary"
                        className="ml-auto h-4 px-1.5 text-[10px]"
                      >
                        {count}
                      </Badge>
                    )}
                  </SelectItem>
                );
              })}
            </SelectGroup>
          </>
        )}
      </SelectContent>
    </Select>
  );
}
