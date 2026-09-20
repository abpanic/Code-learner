import type { Attempt, AttemptStatus, Attempts } from "./attempts";
import type { Difficulty, Problem } from "@/data/problems/types";

/**
 * Pure rollups over the attempt store. No DOM, no React — everything the
 * dashboard shows is derived here so it can be unit-tested directly.
 */

export function statusOf(attempts: Attempts, slug: string): AttemptStatus {
  return attempts[slug]?.status ?? "unsolved";
}

export function solvedSlugs(attempts: Attempts): string[] {
  return Object.values(attempts)
    .filter((attempt) => attempt.status === "solved")
    .map((attempt) => attempt.slug);
}

export type DifficultyCounts = Record<Difficulty, { solved: number; total: number }>;

export function countsByDifficulty(
  problems: readonly Problem[],
  attempts: Attempts,
): DifficultyCounts {
  const counts: DifficultyCounts = {
    easy: { solved: 0, total: 0 },
    medium: { solved: 0, total: 0 },
    hard: { solved: 0, total: 0 },
  };
  for (const problem of problems) {
    counts[problem.difficulty].total += 1;
    if (statusOf(attempts, problem.slug) === "solved") {
      counts[problem.difficulty].solved += 1;
    }
  }
  return counts;
}

export function countsByTopic(
  problems: readonly Problem[],
  attempts: Attempts,
): Map<string, { solved: number; total: number }> {
  const counts = new Map<string, { solved: number; total: number }>();
  for (const problem of problems) {
    const solved = statusOf(attempts, problem.slug) === "solved";
    for (const topicId of problem.topicIds) {
      const entry = counts.get(topicId) ?? { solved: 0, total: 0 };
      entry.total += 1;
      if (solved) entry.solved += 1;
      counts.set(topicId, entry);
    }
  }
  return counts;
}

/** Local-time calendar day, so a streak matches what the learner sees. */
function dayKey(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function shiftDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Consecutive days ending today (or yesterday) with at least one run. Any run
 * counts, not just a solve — showing up is the habit worth tracking.
 */
export function streakDays(attempts: Attempts, now = new Date()): number {
  const days = new Set(Object.values(attempts).map((attempt) => dayKey(attempt.lastRunAt)));
  if (days.size === 0) return 0;

  const today = dayKey(now.toISOString());
  const yesterday = dayKey(shiftDays(now, -1).toISOString());
  // A streak stays alive until the day after the last run has fully passed.
  let cursor = days.has(today) ? now : days.has(yesterday) ? shiftDays(now, -1) : null;
  if (!cursor) return 0;

  let streak = 0;
  while (days.has(dayKey(cursor.toISOString()))) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }
  return streak;
}

export function dueForReview(attempts: Attempts, now = new Date()): Attempt[] {
  return Object.values(attempts)
    .filter((attempt) => attempt.nextReviewAt && new Date(attempt.nextReviewAt) <= now)
    .sort((a, b) => (a.nextReviewAt ?? "").localeCompare(b.nextReviewAt ?? ""));
}

export function recentActivity(attempts: Attempts, limit = 10): Attempt[] {
  return Object.values(attempts)
    .slice()
    .sort((a, b) => b.lastRunAt.localeCompare(a.lastRunAt))
    .slice(0, limit);
}

/** The problem to offer as "continue": most recently touched but unsolved. */
export function continueWith(attempts: Attempts): Attempt | undefined {
  return Object.values(attempts)
    .filter((attempt) => attempt.status === "attempted")
    .sort((a, b) => b.lastRunAt.localeCompare(a.lastRunAt))[0];
}
