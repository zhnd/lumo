import type {
  ClaudeProjectSummary,
  PluginInstalledScope,
} from "@/generated/typeshare-types";

export const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  development: "Development",
  productivity: "Productivity",
  security: "Security",
  learning: "Learning",
  testing: "Testing",
  database: "Database",
  monitoring: "Monitoring",
  deployment: "Deployment",
  design: "Design",
} as const;

/** Get display label for an installed scope. */
export function scopeLabel(
  s: PluginInstalledScope,
  projects: ClaudeProjectSummary[],
): string {
  if (s.scope === "user") return "Global";
  if (s.projectPath) {
    const match = projects.find((p) => p.projectPath === s.projectPath);
    if (match) return match.projectName;
    // Fallback: last segment of path
    return s.projectPath.split("/").filter(Boolean).pop() ?? s.projectPath;
  }
  return "Project";
}
