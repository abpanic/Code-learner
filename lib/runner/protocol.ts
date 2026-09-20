import type { Language } from "@/data/problems/types";

/**
 * Message contract with public/runner-worker.js.
 *
 * The worker executes and reports raw return values; it never decides whether
 * a case passed. Comparison lives in lib/runner/compare.ts so one rule set
 * serves both the live runner and the build-time solution tests.
 */

export type WorkerRequest = {
  id: string;
  language: Language;
  code: string;
  entry: string;
  /** Positional arguments per case, in the same order as `tests`. */
  cases: { args: unknown[] }[];
};

/** What the learner's function returned, or why it could not be called. */
export type CaseOutcome =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export type WorkerResponse =
  | { id: string; type: "ready" }
  | { id: string; type: "loading"; message: string }
  | { id: string; type: "done"; outcomes: CaseOutcome[]; stdout: string; ms: number }
  | { id: string; type: "fatal"; message: string };

/** How long any single run may take before the worker is torn down. */
export const RUN_TIMEOUT_MS = 10_000;

export const WORKER_URL = "/runner-worker.js";
