/** Returns true if the file path looks like a Claude Code plan file. */
export function isPlanFile(filePath: string | undefined): boolean {
  if (!filePath) return false;
  return filePath.includes(".claude/plans/");
}

/** Tools whose content (diff, terminal output) is shown directly — no collapse. */
export const INLINE_TOOLS = new Set(["Edit", "Write", "NotebookEdit", "Bash"]);

/** Tools shown as a single muted line — minimal visual weight. */
export const COMPACT_TOOLS = new Set([
  "Read",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch",
  "Search",
]);

/** Resolve the file path from a tool item's filePath or input JSON. */
export function resolveFilePath(
  filePath: string | undefined,
  input: string | undefined,
): string | undefined {
  if (filePath) return filePath;
  if (!input) return undefined;
  try {
    const parsed = JSON.parse(input);
    return typeof parsed.file_path === "string" ? parsed.file_path : undefined;
  } catch {
    return undefined;
  }
}

/** Shorten a file path for display — keep last 3 segments. */
export function shortenPath(filePath: string): string {
  const parts = filePath.split("/");
  if (parts.length <= 3) return filePath;
  return `.../${parts.slice(-3).join("/")}`;
}
