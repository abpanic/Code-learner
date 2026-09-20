import { describe, expect, it } from "vitest";
import { problems, validateProblems } from "./index";
import { toleranceFor, type Problem, type TestCase } from "./types";
import { findMismatch } from "@/lib/runner/compare";

/**
 * The highest-value test in the project: every reference solution has to pass
 * its own test cases. It catches wrong `expected` values at author time, and
 * because both languages share one test table, checking the JavaScript
 * solution validates the data the Python solution is graded against too.
 */

function runSolution(problem: Problem, test: TestCase): unknown {
  const impl = problem.languages.javascript;
  if (!impl) throw new Error(`${problem.slug} has no JavaScript solution`);
  // Solutions are trusted, authored source — not learner input.
  const factory = new Function(`${impl.solution}\nreturn ${impl.entry};`);
  return (factory() as (...args: unknown[]) => unknown)(...test.args);
}

function expectMatches(actual: unknown, expected: unknown, tolerance: number | undefined) {
  // Same comparison the live runner uses, so a solution that passes here
  // passes in the browser for identical reasons.
  const mismatch = findMismatch(actual, expected, tolerance);
  expect(mismatch && `${mismatch.path}: got ${mismatch.actual}, expected ${mismatch.expected}`)
    .toBeNull();
}

describe("problem data", () => {
  it("passes every structural rule", () => {
    expect(validateProblems(problems)).toStrictEqual([]);
  });

  it("ships at least ten problems across at least three topics", () => {
    expect(problems.length).toBeGreaterThanOrEqual(10);
    const topics = new Set(problems.flatMap((problem) => problem.topicIds));
    expect(topics.size).toBeGreaterThanOrEqual(3);
  });

  it("leaves every theory link as a placeholder for now", () => {
    for (const problem of problems) {
      expect(problem.links.theory).toBe("<placeholder>");
    }
  });
});

describe.each(problems.map((problem) => [problem.slug, problem] as const))(
  "%s",
  (_slug, problem) => {
    it.each(problem.tests.map((test) => [test.name, test] as const))(
      "reference solution passes: %s",
      (_name, test) => {
        expectMatches(runSolution(problem, test), test.expected, toleranceFor(problem, test));
      },
    );

    it("starter code fails at least one test", () => {
      const impl = problem.languages.javascript!;
      expect(impl.starter).not.toBe(impl.solution);
      const passed = problem.tests.map((test) => {
        try {
          const factory = new Function(`${impl.starter}
return ${impl.entry};`);
          const got = (factory() as (...a: unknown[]) => unknown)(...test.args);
          return JSON.stringify(got) === JSON.stringify(test.expected);
        } catch {
          return false;
        }
      });
      // A starter that already passed would mean the problem asks for nothing.
      expect(passed.every(Boolean)).toBe(false);
    });
  },
);
