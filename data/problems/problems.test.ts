import { describe, expect, it } from "vitest";
import { problems, validateProblems } from "./index";
import { toleranceFor, type Problem, type TestCase } from "./types";

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
  if (tolerance !== undefined && typeof expected === "number") {
    expect(typeof actual).toBe("number");
    expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(tolerance);
    return;
  }
  if (tolerance !== undefined && Array.isArray(expected)) {
    expect(Array.isArray(actual)).toBe(true);
    const got = actual as number[];
    expect(got).toHaveLength(expected.length);
    expected.forEach((value, i) => {
      expect(Math.abs(got[i] - (value as number))).toBeLessThanOrEqual(tolerance);
    });
    return;
  }
  expect(actual).toStrictEqual(expected);
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
