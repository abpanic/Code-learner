"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Language } from "@/data/problems/types";

/**
 * Per-problem attempt state: the last editor buffer, the latest run result and
 * enough history for the dashboard.
 *
 * Deliberately a separate key from `ml_transition_skills` (see lib/progress.ts)
 * so a schema change on the code side can never endanger the evidence data the
 * original tracker has been collecting.
 */

export const ATTEMPTS_KEY = "code_learner_attempts_v1";

export type AttemptStatus = "unsolved" | "attempted" | "solved";

export type Attempt = {
  slug: string;
  language: Language;
  /** Last editor buffer, restored when the learner returns. */
  code: string;
  status: AttemptStatus;
  passed: number;
  total: number;
  runs: number;
  /** ISO timestamps. */
  firstSolvedAt?: string;
  lastRunAt: string;
  /** Wall-clock milliseconds of the last run. */
  msElapsed?: number;
  /** When this problem is next worth re-solving. */
  nextReviewAt?: string;
};

export type Attempts = Record<string, Attempt>;

const EMPTY: Attempts = Object.freeze({});

function isAttempt(value: unknown): value is Attempt {
  if (!value || typeof value !== "object") return false;
  const a = value as Partial<Attempt>;
  return typeof a.slug === "string"
    && typeof a.code === "string"
    && typeof a.lastRunAt === "string"
    && (a.status === "unsolved" || a.status === "attempted" || a.status === "solved");
}

function parse(raw: string | null): Attempts {
  if (!raw) return EMPTY;
  try {
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return EMPTY;
    const entries = Object.entries(saved as Record<string, unknown>)
      .filter(([, value]) => isAttempt(value)) as [string, Attempt][];
    return entries.length ? Object.fromEntries(entries) : EMPTY;
  } catch {
    return EMPTY;
  }
}

// Stable snapshot keyed by the raw string, as in lib/progress.ts.
let cachedRaw: string | null = null;
let cachedValue: Attempts = EMPTY;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return localStorage.getItem(ATTEMPTS_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): Attempts {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

function getServerSnapshot(): Attempts {
  return EMPTY;
}

function emit() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key === null || event.key === ATTEMPTS_KEY) emit();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function readAttempts(): Attempts {
  return getSnapshot();
}

/** False when this browser refuses to persist (private mode, quota). */
export function writeAttempts(next: Attempts): boolean {
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(next));
    emit();
    return true;
  } catch {
    return false;
  }
}

export function clearAttempts(): boolean {
  try {
    localStorage.removeItem(ATTEMPTS_KEY);
    emit();
    return true;
  } catch {
    return false;
  }
}

/** Solve intervals in days: first solve 3, then 7, then 21 and onward. */
export const REVIEW_INTERVALS_DAYS = [3, 7, 21];

export function nextReviewDate(solveCount: number, from: Date): string {
  const days = REVIEW_INTERVALS_DAYS[Math.min(solveCount, REVIEW_INTERVALS_DAYS.length - 1)];
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

export type RunOutcome = {
  language: Language;
  code: string;
  passed: number;
  total: number;
  msElapsed?: number;
};

/**
 * Folds one run into an attempt. Pure, so the merge rules are testable without
 * a DOM — `recordRun` is the thin wrapper that persists the result.
 */
export function applyRun(
  previous: Attempt | undefined,
  slug: string,
  outcome: RunOutcome,
  now: Date,
): Attempt {
  const solvedNow = outcome.total > 0 && outcome.passed === outcome.total;
  const wasSolved = previous?.status === "solved";
  const solveCount = (wasSolved ? 1 : 0) + (solvedNow && !wasSolved ? 1 : 0);
  return {
    slug,
    language: outcome.language,
    code: outcome.code,
    status: solvedNow ? "solved" : wasSolved ? "solved" : "attempted",
    passed: outcome.passed,
    total: outcome.total,
    runs: (previous?.runs ?? 0) + 1,
    firstSolvedAt: previous?.firstSolvedAt ?? (solvedNow ? now.toISOString() : undefined),
    lastRunAt: now.toISOString(),
    msElapsed: outcome.msElapsed,
    nextReviewAt: solvedNow ? nextReviewDate(solveCount, now) : previous?.nextReviewAt,
  };
}

export function recordRun(slug: string, outcome: RunOutcome, now = new Date()): boolean {
  const current = getSnapshot();
  return writeAttempts({ ...current, [slug]: applyRun(current[slug], slug, outcome, now) });
}

/** Saves the editor buffer without counting it as a run. */
export function saveDraft(slug: string, language: Language, code: string): boolean {
  const current = getSnapshot();
  const previous = current[slug];
  return writeAttempts({
    ...current,
    [slug]: {
      slug,
      language,
      code,
      status: previous?.status ?? "unsolved",
      passed: previous?.passed ?? 0,
      total: previous?.total ?? 0,
      runs: previous?.runs ?? 0,
      firstSolvedAt: previous?.firstSolvedAt,
      lastRunAt: previous?.lastRunAt ?? new Date().toISOString(),
      msElapsed: previous?.msElapsed,
      nextReviewAt: previous?.nextReviewAt,
    },
  });
}

export function useAttempts() {
  const attempts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const statusOf = useCallback(
    (slug: string): AttemptStatus => attempts[slug]?.status ?? "unsolved",
    [attempts],
  );
  return { attempts, statusOf };
}
