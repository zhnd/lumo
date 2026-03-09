"use client";

import hljs from "highlight.js/lib/core";
import markdown from "highlight.js/lib/languages/markdown";
import yaml from "highlight.js/lib/languages/yaml";
import Editor from "react-simple-code-editor";
import "highlight.js/styles/github.css";

hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("yaml", yaml);

const FRONTMATTER_RE = /^(---\n)([\s\S]*?\n)(---)\n?/;

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function highlight(code: string): string {
  const match = code.match(FRONTMATTER_RE);
  if (!match) {
    return hljs.highlight(code, { language: "markdown" }).value;
  }

  const fmOpen = match[1]; // "---\n"
  const fmBody = match[2]; // yaml content
  const fmClose = match[3]; // "---"
  const rest = code.slice(match[0].length);

  const yamlHtml = hljs.highlight(fmBody, { language: "yaml" }).value;
  const mdHtml = rest
    ? hljs.highlight(rest, { language: "markdown" }).value
    : "";

  return (
    `<span class="hljs-meta">${fmOpen}</span>` +
    yamlHtml +
    `<span class="hljs-meta">${fmClose}</span>\n` +
    mdHtml
  );
}

export function CodeEditor({ value, onChange, className }: CodeEditorProps) {
  return (
    <Editor
      value={value}
      onValueChange={onChange}
      highlight={highlight}
      padding={16}
      className={className}
      textareaClassName="outline-none"
      style={{
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        fontSize: "12px",
        lineHeight: "1.625",
      }}
    />
  );
}
