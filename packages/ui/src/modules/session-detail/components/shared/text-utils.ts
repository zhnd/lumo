const COMMAND_TAGS = new Set([
  "command-name",
  "command-message",
  "command-args",
  "local-command-stdout",
  "local-command-stderr",
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

export function extractStandaloneStdout(text: string): string | null {
  const stripped = text.replace(/\n{3,}/g, "\n\n").trim();
  const stdoutMatch = stripped.match(
    /^<local-command-stdout>([\s\S]*?)<\/local-command-stdout>$/,
  );
  return stdoutMatch?.[1].trim() || null;
}

export function sanitizeMessageText(text: string): string {
  return renderXmlLikeMetaTags(text)
    .replace(
      /<\/?(?:command-name|command-message|command-args|local-command-stdout|local-command-stderr)>[\s\S]*?<\/(?:command-name|command-message|command-args|local-command-stdout|local-command-stderr)>/g,
      "",
    )
    .replace(
      /<\/?(?:command-name|command-message|command-args|local-command-stdout|local-command-stderr)(?:\s[^>]*)?>/g,
      "",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderXmlLikeMetaTags(text: string): string {
  return text.replace(
    /<([a-zA-Z][\w-]*)(?:\s[^>]*)?>\s*([\s\S]*?)\s*<\/\1>/g,
    (full: string, tagName: string, content: string) => {
      const tag = tagName.toLowerCase();

      if (COMMAND_TAGS.has(tag) || HTML_LIKE_TAGS.has(tag)) {
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
