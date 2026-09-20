"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Download, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type NotebookOutput = {
  output_type: string;
  text?: string | string[];
  ename?: string;
  evalue?: string;
  data?: Record<string, string | string[]>;
};
type NotebookCell = {
  cell_type: "markdown" | "code" | "raw";
  source: string | string[];
  execution_count?: number | null;
  outputs?: NotebookOutput[];
};
type Notebook = { nbformat: number; metadata?: Record<string, unknown>; cells: NotebookCell[] };
const toText = (value?: string | string[]) => Array.isArray(value) ? value.join("") : value || "";

/**
 * A notebook is embedded inside a page that already has an h1 and h2s, so its
 * own markdown headings are pushed down two levels. Rendering a notebook's `#`
 * as a second h1 breaks the page outline for screen readers.
 */
const HEADING_SHIFT = {
  h1: (props: React.ComponentProps<"h3">) => <h3 {...props} />,
  h2: (props: React.ComponentProps<"h4">) => <h4 {...props} />,
  h3: (props: React.ComponentProps<"h5">) => <h5 {...props} />,
  h4: (props: React.ComponentProps<"h6">) => <h6 {...props} />,
  h5: (props: React.ComponentProps<"h6">) => <h6 {...props} />,
  h6: (props: React.ComponentProps<"h6">) => <h6 {...props} />,
} as const;

type ViewState =
  | { status: "loading" }
  | { status: "ready"; notebook: Notebook }
  | { status: "error"; message: string };

/**
 * Fetches and renders a saved notebook. Callers that swap `topicId` in place
 * should pass `key={topicId}` so the view resets with the new notebook.
 */
export function NotebookViewer({ topicId, title, available }: { topicId: string; title: string; available: boolean }) {
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const path = `/notebooks/${encodeURIComponent(topicId)}.ipynb`;
  useEffect(() => {
    if (!available) return;
    const controller = new AbortController();
    fetch(path, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("This notebook could not be loaded.");
      const data: Notebook = await response.json();
      if (data.nbformat !== 4 || !Array.isArray(data.cells)) throw new Error("This file is not a supported Jupyter notebook.");
      setState({ status: "ready", notebook: data });
    }).catch(err => {
      if (err.name !== "AbortError") setState({ status: "error", message: err.message || "Notebook unavailable." });
    });
    return () => controller.abort();
  }, [available, path]);
  const notebook = state.status === "ready" ? state.notebook : null;
  if (!available) return <div className="notebook-empty"><FileCode2 size={28} /><h3>No notebook yet for {title}</h3><p>A Jupyter notebook can be attached to this topic. Available notebooks appear here with code, explanations, and saved outputs.</p></div>;
  return <div className="notebook-viewer">
    <div className="notebook-toolbar"><div><strong>Python notebook</strong><span>Read-only preview · saved outputs · no code execution</span></div><Button asChild size="sm" variant="outline"><a href={path} download={`${topicId}.ipynb`}><Download size={15} /> Download .ipynb</a></Button></div>
    {state.status === "loading" && <p className="notebook-message" role="status">Loading notebook…</p>}
    {state.status === "error" && <p className="notebook-message" role="alert">{state.message}</p>}
    {notebook?.cells.map((cell, index) => <div className={`notebook-cell ${cell.cell_type}`} key={index}>
      {cell.cell_type === "markdown" && <div className="notebook-markdown"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={HEADING_SHIFT}>{toText(cell.source)}</ReactMarkdown></div>}
      {cell.cell_type === "code" && <><div className="cell-label">In [{cell.execution_count ?? " "}]</div><pre className="cell-code"><code>{toText(cell.source)}</code></pre>
        {cell.outputs?.map((output, outputIndex) => <div className="cell-output" key={outputIndex}>
          {/* eslint-disable-next-line @next/next/no-img-element -- inline base64 output; next/image cannot optimise data URIs */}
          {typeof output.data?.["image/png"] !== "undefined" && <img alt={`Output of cell ${index + 1}`} src={`data:image/png;base64,${toText(output.data["image/png"]).replace(/\s/g, "")}`} />}
          {typeof output.data?.["text/plain"] !== "undefined" && <pre>{toText(output.data["text/plain"])}</pre>}
          {typeof output.text !== "undefined" && <pre>{toText(output.text)}</pre>}
          {output.output_type === "error" && <pre className="cell-error">{output.ename}: {output.evalue}</pre>}
        </div>)}
      </>}
      {cell.cell_type === "raw" && <pre className="cell-code">{toText(cell.source)}</pre>}
    </div>)}
  </div>;
}
