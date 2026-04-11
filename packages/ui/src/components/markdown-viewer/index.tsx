"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import "highlight.js/styles/github.css";
import { markdownComponents } from "./markdown-components";

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

/**
 * Remark plugin that converts HTML AST nodes back to text nodes.
 * This prevents `<unknown-tag>content</unknown-tag>` from being
 * silently swallowed by the markdown parser.
 */
function remarkPreserveHtml() {
  return (tree: any) => {
    visit(tree, "html", (node: any, index: any, parent: any) => {
      if (parent && index !== undefined && node.value) {
        parent.children[index] = { type: "text", value: node.value };
      }
    });
  };
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkFrontmatter, remarkGfm, remarkPreserveHtml]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
