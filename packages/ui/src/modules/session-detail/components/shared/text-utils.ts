/** All Claude Code special XML tags that should be stripped or handled specially. */
const SPECIAL_TAGS = new Set([
  // Command / skill
  "command-name",
  "command-message",
  "command-args",
  "skill-format",
  // Terminal output
  "local-command-stdout",
  "local-command-stderr",
  "local-command-caveat",
  "bash-input",
  "bash-stdout",
  "bash-stderr",
  // Task / agent
  "task-notification",
  "task-id",
  "tool-use-id",
  "task-type",
  "output-file",
  "status",
  "summary",
  "reason",
  "tick",
  "teammate-message",
  "channel-message",
  "channel",
  "cross-session-message",
  // Worktree
  "worktree",
  "worktreePath",
  "worktreeBranch",
  // UI meta
  "fork-boilerplate",
  "system-reminder",
  "ultraplan",
  "remote-review",
  "remote-review-progress",
  "user-prompt-submit-hook",
]);

const HTML_LIKE_TAGS = new Set([
  "p",
  "div",
  "span",
  "code",
  "pre",
  "a",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "strong",
  "em",
  "blockquote",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

const META_TAG_LABELS: Record<string, string> = {
  "system-reminder": "System reminder",
  "local-command-caveat": "Local command caveat",
};

export interface SlashCommand {
  name: string;
  message: string;
  args: string;
  stdout: string | null;
}

export function extractSlashCommand(text: string): SlashCommand | null {
  const nameMatch = text.match(/<command-name>([\s\S]*?)<\/command-name>/);
  if (!nameMatch) return null;

  const messageMatch = text.match(
    /<command-message>([\s\S]*?)<\/command-message>/,
  );
  const argsMatch = text.match(/<command-args>([\s\S]*?)<\/command-args>/);
  const stdoutMatch = text.match(
    /<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/,
  );

  return {
    name: nameMatch[1].trim(),
    message: messageMatch?.[1].trim() ?? "",
    args: argsMatch?.[1].trim() ?? "",
    stdout: stdoutMatch?.[1].trim() || null,
  };
}

function extractStandaloneStdout(text: string): string | null {
  const stripped = text.replace(/\n{3,}/g, "\n\n").trim();
  const stdoutMatch = stripped.match(
    /^<local-command-stdout>([\s\S]*?)<\/local-command-stdout>$/,
  );
  return stdoutMatch?.[1].trim() || null;
}

/** Build a regex alternation from the SPECIAL_TAGS set. */
const SPECIAL_TAGS_PATTERN = [...SPECIAL_TAGS].join("|");

export function sanitizeMessageText(text: string): string {
  // 1. Convert recognized meta-tags (system-reminder etc.) to blockquotes
  // 2. Strip all special paired tags: <tag>content</tag>
  // 3. Strip any remaining orphaned special tags: <tag> or </tag>
  const pairedRe = new RegExp(
    `<(?:${SPECIAL_TAGS_PATTERN})(?:\\s[^>]*)?>` +
      `[\\s\\S]*?` +
      `<\\/(?:${SPECIAL_TAGS_PATTERN})>`,
    "g",
  );
  const orphanRe = new RegExp(
    `<\\/?(?:${SPECIAL_TAGS_PATTERN})(?:\\s[^>]*)?>`,
    "g",
  );

  return renderXmlLikeMetaTags(text)
    .replace(pairedRe, "")
    .replace(orphanRe, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderXmlLikeMetaTags(text: string): string {
  return text.replace(
    /<([a-zA-Z][\w-]*)(?:\s[^>]*)?>\s*([\s\S]*?)\s*<\/\1>/g,
    (full: string, tagName: string, content: string) => {
      const tag = tagName.toLowerCase();

      if (SPECIAL_TAGS.has(tag) || HTML_LIKE_TAGS.has(tag)) {
        return full;
      }
      if (!META_TAG_LABELS[tag] && !/[-_]/.test(tag)) {
        return full;
      }

      const normalized = content
        .trim()
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ");

      if (!normalized) return "";

      const label = META_TAG_LABELS[tag] ?? toHumanTagLabel(tag);
      return `\n> ${label}: ${normalized}\n`;
    },
  );
}

function toHumanTagLabel(tag: string): string {
  return tag
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Strip ANSI escape sequences (colors, bold, dim, etc.) from terminal output. */
export function stripAnsiCodes(text: string): string {
  const ESC = String.fromCharCode(0x1b);
  const BEL = String.fromCharCode(0x07);
  // CSI sequences: ESC[...letter
  const csi = new RegExp(`${ESC}\\[[0-9;]*[A-Za-z]`, "g");
  // OSC sequences: ESC]...BEL
  const osc = new RegExp(`${ESC}\\][^${BEL}]*${BEL}`, "g");
  return text
    .replace(csi, "")
    .replace(osc, "")
    .replace(/\[(\d+)m/g, "");
}

/**
 * Clean text for display (titles, previews).
 * Only processes text that is actually a slash command or system metadata.
 * Regular user text is returned as-is to avoid stripping content that
 * happens to look like XML tags.
 */
export function cleanDisplayText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  // Caveat messages — hide entirely
  if (trimmed.startsWith("<local-command-caveat>")) {
    return "";
  }

  // If it's a slash command, format it
  const command = extractSlashCommand(trimmed);
  if (command) {
    const name = command.name.startsWith("/")
      ? command.name
      : `/${command.name}`;
    return `${name}${command.args ? ` ${command.args}` : ""}`;
  }

  // If it's purely a local-command-stdout block (standalone output, no user text)
  if (
    trimmed.startsWith("<local-command-stdout>") ||
    trimmed.startsWith("<local-command-stderr>")
  ) {
    const stdout = extractStandaloneStdout(trimmed);
    if (stdout) return stripAnsiCodes(stdout).slice(0, 100);
    return "";
  }

  // Regular user text — collapse to single line, truncate
  const singleLine = trimmed.replace(/\n+/g, " ").replace(/\s+/g, " ");
  return singleLine.length > 120
    ? `${singleLine.slice(0, 120)}...`
    : singleLine;
}

export function formatToolInput(input: string): string {
  try {
    const parsed = JSON.parse(input);
    if (parsed.command) return parsed.command;
    if (parsed.file_path) return parsed.file_path;
    if (parsed.pattern) return parsed.pattern;
    if (parsed.query) return parsed.query;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return input;
  }
}
