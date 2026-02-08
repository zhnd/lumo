import type { Components } from "react-markdown";
import { MermaidDiagram } from "./mermaid-diagram";

export const markdownComponents: Partial<Components> = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg border border-border bg-muted p-3 text-xs leading-relaxed [&>code]:bg-transparent [&>code]:p-0">
      {children}
    </pre>
  ),
  code: ({ children, className }) => {
    const content = String(children ?? "").trim();
    const isMermaid =
      className?.includes("language-mermaid") ||
      className?.includes("lang-mermaid");

    if (isMermaid) {
      return <MermaidDiagram chart={content} />;
    }

    if (className?.startsWith("hljs") || className?.includes("language-"))
      return <code className={className}>{children}</code>;
    return (
      <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[13px]">
        {children}
      </code>
    );
  },
  ul: ({ children }) => (
    <ul className="mb-3 list-disc pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="mb-1">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2 hover:text-primary/80"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => (
    <h1 className="mb-3 text-base font-semibold">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 text-sm font-semibold">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 text-sm font-medium">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-border pl-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-border bg-muted px-3 py-1.5 text-left text-xs font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border px-3 py-1.5 text-xs">
      {children}
    </td>
  ),
  hr: () => <hr className="my-4 border-border" />,
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
};
