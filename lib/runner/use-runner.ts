"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Language, Problem, TestCase } from "@/data/problems/types";
import { toleranceFor } from "@/data/problems/types";
import { findMismatch, formatValue } from "./compare";
import {
  RUN_TIMEOUT_MS,
  WORKER_URL,
  type CaseOutcome,
  type WorkerRequest,
  type WorkerResponse,
} from "./protocol";

export type TestResult = {
  name: string;
  hidden: boolean;
  status: "pass" | "fail" | "error";
  expected: string;
  actual?: string;
  error?: string;
  /** Where nested values diverged, e.g. `[2]` — empty for a top-level value. */
  at?: string;
};

export type RunnerPhase = "idle" | "starting" | "running" | "done" | "failed";

export type RunnerState = {
  phase: RunnerPhase;
  message: string;
  results: TestResult[];
  stdout: string;
  ms: number;
  passed: number;
  total: number;
};

const IDLE: RunnerState = {
  phase: "idle", message: "", results: [], stdout: "", ms: 0, passed: 0, total: 0,
};

function grade(tests: TestCase[], problem: Problem, outcomes: CaseOutcome[]): TestResult[] {
  return tests.map((test, index) => {
    const outcome = outcomes[index];
    const expected = formatValue(test.expected);
    if (!outcome) {
      return { name: test.name, hidden: !!test.hidden, status: "error", expected, error: "No result returned." };
    }
    if (!outcome.ok) {
      return { name: test.name, hidden: !!test.hidden, status: "error", expected, error: outcome.error };
    }
    const mismatch = findMismatch(outcome.value, test.expected, toleranceFor(problem, test));
    if (!mismatch) {
      return { name: test.name, hidden: !!test.hidden, status: "pass", expected, actual: formatValue(outcome.value) };
    }
    return {
      name: test.name,
      hidden: !!test.hidden,
      status: "fail",
      expected: mismatch.expected,
      actual: mismatch.actual,
      at: mismatch.path,
    };
  });
}

/**
 * Owns the worker for one problem page.
 *
 * The worker is created on the first run, not on mount, so a visitor who only
 * reads the page never pays for Pyodide. It is then kept warm across runs —
 * booting Python is by far the slowest part — and only torn down on timeout,
 * on a fatal error, or when the page unmounts.
 */
export function useRunner(problem: Problem) {
  const [state, setState] = useState<RunnerState>(IDLE);
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(0);

  const teardown = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  const run = useCallback(
    (language: Language, code: string, includeHidden: boolean) =>
      new Promise<RunnerState>((resolve) => {
        const impl = problem.languages[language];
        if (!impl) {
          const failed = { ...IDLE, phase: "failed" as const, message: `No ${language} starter for this problem.` };
          setState(failed);
          resolve(failed);
          return;
        }

        const tests = includeHidden ? problem.tests : problem.tests.filter((t) => !t.hidden);
        const id = String(++runIdRef.current);
        const startedAt = Date.now();

        if (!workerRef.current) workerRef.current = new Worker(WORKER_URL);
        const worker = workerRef.current;

        const finish = (next: RunnerState) => {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = null;
          worker.onmessage = null;
          worker.onerror = null;
          setState(next);
          resolve(next);
        };

        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const data = event.data;
          if (data.id !== id && data.type !== "ready") return;
          if (data.type === "loading") {
            setState((prev) => ({ ...prev, phase: "starting", message: data.message }));
            return;
          }
          if (data.type === "fatal") {
            teardown();
            finish({ ...IDLE, phase: "failed", message: data.message });
            return;
          }
          if (data.type === "done") {
            const results = grade(tests, problem, data.outcomes);
            finish({
              phase: "done",
              message: "",
              results,
              stdout: data.stdout,
              ms: data.ms || Date.now() - startedAt,
              passed: results.filter((r) => r.status === "pass").length,
              total: results.length,
            });
          }
        };

        worker.onerror = (event) => {
          teardown();
          finish({ ...IDLE, phase: "failed", message: event.message || "The runner could not start." });
        };

        // A runaway loop cannot be interrupted from outside, so the only cure
        // is terminating the worker; the next run rebuilds it.
        timerRef.current = setTimeout(() => {
          teardown();
          finish({
            ...IDLE,
            phase: "failed",
            message: `Stopped after ${RUN_TIMEOUT_MS / 1000}s — check for an infinite loop.`,
          });
        }, RUN_TIMEOUT_MS);

        setState({ ...IDLE, phase: "running", message: "Running tests…" });
        const request: WorkerRequest = {
          id,
          language,
          code,
          entry: impl.entry,
          cases: tests.map((test) => ({ args: test.args })),
        };
        worker.postMessage(request);
      }),
    [problem, teardown],
  );

  const reset = useCallback(() => setState(IDLE), []);

  return { state, run, reset };
}
