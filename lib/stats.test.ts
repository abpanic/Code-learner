import { describe, expect, it } from "vitest";
import { applyRun, nextReviewDate, type Attempt, type Attempts } from "./attempts";
import {
  continueWith,
  countsByDifficulty,
  countsByTopic,
  dueForReview,
  recentActivity,
  statusOf,
  streakDays,
} from "./stats";
import type { Problem } from "@/data/problems/types";

const AT = (iso: string) => new Date(iso);

function attempt(over: Partial<Attempt> & Pick<Attempt, "slug">): Attempt {
  return {
    language: "python",
    code: "",
    status: "attempted",
    passed: 0,
    total: 3,
    runs: 1,
    lastRunAt: "2026-09-20T10:00:00.000Z",
    ...over,
  };
}

function store(...list: Attempt[]): Attempts {
  return Object.fromEntries(list.map((a) => [a.slug, a]));
}

function problem(slug: string, over: Partial<Problem> = {}): Problem {
  return {
    slug,
    title: slug,
    difficulty: "easy",
    topicIds: ["lin_reg"],
    tags: [],
    prompt: "",
    links: { theory: "<placeholder>", explanation: "<placeholder>", learnMore: "<placeholder>" },
    languages: {},
    tests: [],
    hints: [],
    ...over,
  };
}

describe("applyRun", () => {
  const now = AT("2026-09-20T12:00:00.000Z");

  it("marks a full pass as solved and schedules the first review", () => {
    const result = applyRun(undefined, "a", {
      language: "python", code: "x", passed: 3, total: 3,
    }, now);
    expect(result.status).toBe("solved");
    expect(result.firstSolvedAt).toBe(now.toISOString());
    expect(result.nextReviewAt).toBe(nextReviewDate(1, now));
    expect(result.runs).toBe(1);
  });

  it("marks a partial pass as attempted", () => {
    const result = applyRun(undefined, "a", {
      language: "python", code: "x", passed: 2, total: 3,
    }, now);
    expect(result.status).toBe("attempted");
    expect(result.firstSolvedAt).toBeUndefined();
    expect(result.nextReviewAt).toBeUndefined();
  });

  it("keeps a solved problem solved after a later failing run", () => {
    const solved = applyRun(undefined, "a", {
      language: "python", code: "x", passed: 3, total: 3,
    }, now);
    const later = applyRun(solved, "a", {
      language: "python", code: "broken", passed: 1, total: 3,
    }, AT("2026-09-21T12:00:00.000Z"));
    expect(later.status).toBe("solved");
    expect(later.firstSolvedAt).toBe(solved.firstSolvedAt);
    expect(later.runs).toBe(2);
    expect(later.passed).toBe(1);
  });

  it("counts zero tests as not solved", () => {
    const result = applyRun(undefined, "a", {
      language: "python", code: "", passed: 0, total: 0,
    }, now);
    expect(result.status).toBe("attempted");
  });
});

describe("streakDays", () => {
  const now = AT("2026-09-20T12:00:00.000Z");

  it("is zero with no attempts", () => {
    expect(streakDays({}, now)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    const attempts = store(
      attempt({ slug: "a", lastRunAt: "2026-09-20T09:00:00.000Z" }),
      attempt({ slug: "b", lastRunAt: "2026-09-19T09:00:00.000Z" }),
      attempt({ slug: "c", lastRunAt: "2026-09-18T09:00:00.000Z" }),
    );
    expect(streakDays(attempts, now)).toBe(3);
  });

  it("survives a day that has not ended yet", () => {
    const attempts = store(attempt({ slug: "a", lastRunAt: "2026-09-19T09:00:00.000Z" }));
    expect(streakDays(attempts, now)).toBe(1);
  });

  it("breaks after a missed day", () => {
    const attempts = store(attempt({ slug: "a", lastRunAt: "2026-09-17T09:00:00.000Z" }));
    expect(streakDays(attempts, now)).toBe(0);
  });

  it("does not double-count two runs on the same day", () => {
    const attempts = store(
      attempt({ slug: "a", lastRunAt: "2026-09-20T09:00:00.000Z" }),
      attempt({ slug: "b", lastRunAt: "2026-09-20T18:00:00.000Z" }),
    );
    expect(streakDays(attempts, now)).toBe(1);
  });
});

describe("rollups", () => {
  const problems = [
    problem("a"),
    problem("b", { difficulty: "medium" }),
    problem("c", { difficulty: "medium", topicIds: ["log_reg", "lin_reg"] }),
  ];
  const attempts = store(
    attempt({ slug: "a", status: "solved" }),
    attempt({ slug: "c", status: "solved" }),
  );

  it("counts solves by difficulty", () => {
    expect(countsByDifficulty(problems, attempts)).toStrictEqual({
      easy: { solved: 1, total: 1 },
      medium: { solved: 1, total: 2 },
      hard: { solved: 0, total: 0 },
    });
  });

  it("counts a multi-topic problem under each of its topics", () => {
    const byTopic = countsByTopic(problems, attempts);
    expect(byTopic.get("lin_reg")).toStrictEqual({ solved: 2, total: 3 });
    expect(byTopic.get("log_reg")).toStrictEqual({ solved: 1, total: 1 });
  });

  it("reports unsolved for an untouched problem", () => {
    expect(statusOf(attempts, "b")).toBe("unsolved");
  });
});

describe("queues", () => {
  const now = AT("2026-09-20T12:00:00.000Z");

  it("returns only reviews that are due, oldest first", () => {
    const attempts = store(
      attempt({ slug: "due-later", status: "solved", nextReviewAt: "2026-09-25T00:00:00.000Z" }),
      attempt({ slug: "due-now", status: "solved", nextReviewAt: "2026-09-19T00:00:00.000Z" }),
      attempt({ slug: "due-oldest", status: "solved", nextReviewAt: "2026-09-01T00:00:00.000Z" }),
      attempt({ slug: "never", status: "attempted" }),
    );
    expect(dueForReview(attempts, now).map((a) => a.slug)).toStrictEqual(["due-oldest", "due-now"]);
  });

  it("orders recent activity newest first", () => {
    const attempts = store(
      attempt({ slug: "old", lastRunAt: "2026-09-01T00:00:00.000Z" }),
      attempt({ slug: "new", lastRunAt: "2026-09-20T00:00:00.000Z" }),
    );
    expect(recentActivity(attempts).map((a) => a.slug)).toStrictEqual(["new", "old"]);
  });

  it("offers the newest unsolved attempt to continue", () => {
    const attempts = store(
      attempt({ slug: "solved", status: "solved", lastRunAt: "2026-09-20T00:00:00.000Z" }),
      attempt({ slug: "stuck", status: "attempted", lastRunAt: "2026-09-19T00:00:00.000Z" }),
    );
    expect(continueWith(attempts)?.slug).toBe("stuck");
  });

  it("offers nothing when everything is solved", () => {
    expect(continueWith(store(attempt({ slug: "a", status: "solved" })))).toBeUndefined();
  });
});
