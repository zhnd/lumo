"use client";

import { useEffect, useId, useMemo, useState } from "react";
import mermaid from "mermaid";

let mermaidInitialized = false;

export function MermaidDiagram({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const id = useId();
  const renderId = useMemo(() => `mermaid-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`, [id]);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        setError("");
        setSvg("");

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "loose",
            theme: "default",
          });
          mermaidInitialized = true;
        }

        const output = await mermaid.render(renderId, chart);
        if (!cancelled) {
          setSvg(output.svg);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to render Mermaid diagram";
          setError(msg);
        }
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [chart, renderId]);

  if (error) {
    return (
      <pre className="my-3 overflow-x-auto rounded-lg border border-border bg-muted p-3 text-xs leading-relaxed">
        {chart}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="my-3 rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      className="my-3 overflow-x-auto rounded-lg border border-border bg-background p-3"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
