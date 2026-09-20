"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Play, RotateCcw, Send, X } from "lucide-react";
import {
  LANGUAGE_LABELS,
  languagesOf,
  type Language,
  type Problem,
} from "@/data/problems/types";
import { readAttempts, recordRun, saveDraft } from "@/lib/attempts";
import { useRunner, type TestResult } from "@/lib/runner/use-runner";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "./code-editor";

const DRAFT_DEBOUNCE_MS = 700;

export function Workspace({ problem }: { problem: Problem }) {
  const available = useMemo(() => languagesOf(problem), [problem]);
  const [language, setLanguage] = useState<Language>(available[0]);
  const [code, setCode] = useState(() => problem.languages[available[0]]?.starter ?? "");
  const [restored, setRestored] = useState(false);
  const { state, run, reset } = useRunner(problem);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The saved buffer can only be read after hydration, so this belongs in an
  // effect. Same pattern as the deep-link handling in app/tracker.tsx.
  useEffect(() => {
    const saved = readAttempts()[problem.slug];
    /* eslint-disable react-hooks/set-state-in-effect -- restoring the saved draft after hydration */
    if (saved && saved.code && problem.languages[saved.language]) {
      setLanguage(saved.language);
      setCode(saved.code);
      setRestored(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [problem]);

  useEffect(() => () => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
  }, []);

  const editCode = (next: string) => {
    setCode(next);
    setRestored(false);
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => saveDraft(problem.slug, language, next), DRAFT_DEBOUNCE_MS);
  };

  const switchLanguage = (next: Language) => {
    if (next === language) return;
    const saved = readAttempts()[problem.slug];
    setLanguage(next);
    setCode(
      saved?.language === next && saved.code
        ? saved.code
        : problem.languages[next]?.starter ?? "",
    );
    setRestored(false);
    reset();
  };

  const resetCode = () => {
    setCode(problem.languages[language]?.starter ?? "");
    setRestored(false);
    reset();
  };

  const execute = async (includeHidden: boolean) => {
    const result = await run(language, code, includeHidden);
    if (result.phase === "done") {
      recordRun(problem.slug, {
        language,
        code,
        passed: result.passed,
        total: result.total,
        msElapsed: result.ms,
      });
    }
  };

  const busy = state.phase === "running" || state.phase === "starting";
  const solved = state.phase === "done" && state.total > 0 && state.passed === state.total;

  return <section className="workspace" aria-label="Code workspace">
    <div className="workspace-bar">
      <div className="lang-switch" role="group" aria-label="Language">
        {available.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === language}
            className={option === language ? "lang-active" : ""}
            onClick={() => switchLanguage(option)}
          >
            {LANGUAGE_LABELS[option]}
          </button>
        ))}
      </div>
      <div className="workspace-actions">
        <Button variant="ghost" size="sm" onClick={resetCode} disabled={busy}>
          <RotateCcw size={15} /> Reset
        </Button>
        <Button variant="outline" size="sm" onClick={() => execute(true)} disabled={busy}>
          <Send size={15} /> Submit
        </Button>
        <Button size="sm" onClick={() => execute(false)} disabled={busy}>
          <Play size={15} /> {busy ? "Running…" : "Run"}
        </Button>
      </div>
    </div>

    {restored && (
      <p className="workspace-note" role="status">
        Picked up where you left off. <button type="button" onClick={resetCode}>Start over</button>
      </p>
    )}

    <CodeEditor
      value={code}
      language={language}
      onChange={editCode}
      onRun={() => execute(false)}
      onSubmit={() => execute(true)}
      label={`${LANGUAGE_LABELS[language]} solution for ${problem.title}`}
    />
    <p className="workspace-hint">
      <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Enter</kbd> runs the visible tests;
      add <kbd>Shift</kbd> to submit with the hidden ones. Press <kbd>?</kbd> for all shortcuts.
    </p>

    <Results state={state} solved={solved} />
  </section>;
}

function Results({
  state,
  solved,
}: {
  state: ReturnType<typeof useRunner>["state"];
  solved: boolean;
}) {
  if (state.phase === "idle") {
    return <div className="results results-idle" role="status">
      <p>Run the tests to see results. Python loads on your first run and stays warm after that.</p>
    </div>;
  }

  if (state.phase === "starting" || state.phase === "running") {
    return <div className="results results-idle" role="status" aria-busy="true">
      <p>{state.message || "Working…"}</p>
    </div>;
  }

  if (state.phase === "failed") {
    return <div className="results results-failed" role="alert">
      <AlertTriangle size={16} aria-hidden="true" />
      <p>{state.message}</p>
    </div>;
  }

  return <div className="results" role="status">
    <div className={`results-head ${solved ? "results-solved" : ""}`}>
      <strong>{state.passed} / {state.total} passed</strong>
      <span>{state.ms} ms</span>
    </div>
    <ul className="result-list">
      {state.results.map((result) => <ResultRow key={result.name} result={result} />)}
    </ul>
    {state.stdout && <pre className="results-stdout" aria-label="Printed output">{state.stdout}</pre>}
  </div>;
}

function ResultRow({ result }: { result: TestResult }) {
  return <li className={`result-row result-${result.status}`}>
    <span className="result-icon" aria-hidden="true">
      {result.status === "pass" ? <Check size={14} /> : <X size={14} />}
    </span>
    <div>
      <p className="result-name">
        {result.name}
        {result.hidden && <span className="result-hidden">hidden</span>}
      </p>
      {result.status === "fail" && (
        <p className="result-diff">
          got <code>{result.actual}</code> · expected <code>{result.expected}</code>
          {result.at && <span className="result-at"> at {result.at}</span>}
        </p>
      )}
      {result.status === "error" && <p className="result-diff result-error-text">{result.error}</p>}
    </div>
  </li>;
}
