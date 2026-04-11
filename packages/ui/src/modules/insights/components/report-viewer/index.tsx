"use client";

import { useMemo } from "react";
import type { ReportViewerProps } from "./types";

const NAV_INTERCEPTOR_SCRIPT = `
<script>
document.addEventListener('click', function(e) {
  var anchor = e.target.closest('a');
  if (!anchor) return;
  var href = anchor.getAttribute('href') || '';
  // Handle hash links: scroll to element
  if (href.startsWith('#')) {
    e.preventDefault();
    var id = href.slice(1);
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  // Block any localhost navigation
  if (href.includes('localhost')) {
    e.preventDefault();
    var hashIdx = href.indexOf('#');
    if (hashIdx !== -1) {
      var id = href.slice(hashIdx + 1);
      var el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    return;
  }
}, true);
</script>
`;

function prepareHtml(html: string): string {
  // Rewrite absolute localhost URLs to hash-only anchors
  let result = html.replace(
    /href="https?:\/\/localhost[^"]*#([^"]*)"/g,
    'href="#$1"',
  );

  // Remove localhost URLs without hash (just disable them)
  result = result.replace(/href="https?:\/\/localhost[^"]*"/g, 'href="#"');

  // Inject navigation interceptor script before </body>
  if (result.includes("</body>")) {
    result = result.replace("</body>", `${NAV_INTERCEPTOR_SCRIPT}</body>`);
  } else {
    result += NAV_INTERCEPTOR_SCRIPT;
  }

  return result;
}

export function ReportViewer({ html }: ReportViewerProps) {
  const safeHtml = useMemo(() => prepareHtml(html), [html]);

  return (
    <iframe
      srcDoc={safeHtml}
      title="Insights Report"
      className="h-full w-full border-0"
      sandbox="allow-scripts"
    />
  );
}
