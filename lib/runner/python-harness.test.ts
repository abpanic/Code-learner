import { createRequire } from "node:module";
import { dirname } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { loadPyodide, type PyodideInterface } from "pyodide";
import { problems } from "@/data/problems";
import { lessons } from "@/data/lessons";
import { toleranceFor } from "@/data/problems/types";
import { findMismatch } from "./compare";

/**
 * Exercises the real Python path of public/runner-worker.js against a real
 * CPython-in-WASM, so the harness is verified without a browser.
 *
 * The harness source is read out of the worker file rather than duplicated,
 * so this test fails if the two ever drift apart.
 */

const workerSource = readFileSync(
  fileURLToPath(new URL("../../public/runner-worker.js", import.meta.url)),
  "utf8",
);

function extractHarness(): string {
  const match = workerSource.match(/const HARNESS_PY = `([\s\S]*?)`;/);
  if (!match) throw new Error("HARNESS_PY not found in public/runner-worker.js");
  return match[1];
}

const HARNESS_PY = extractHarness();

type Outcome = { ok: true; value: unknown } | { ok: false; error: string };

let pyodide: PyodideInterface;

/** Mirrors runPython() in the worker. */
function runPython(code: string, entry: string, cases: unknown[][]): Outcome[] {
  const globals = pyodide.globals.get("dict")();
  try {
    pyodide.runPython(code, { globals });
    const fn = globals.get(entry);
    if (!fn) return cases.map(() => ({ ok: false, error: `${entry} is not defined` }));
    fn.destroy();
    globals.set("__cases_json", JSON.stringify(cases));
    globals.set("__entry_name", entry);
    pyodide.runPython(HARNESS_PY, { globals });
    return JSON.parse(globals.get("__outcomes_json")) as Outcome[];
  } finally {
    globals.destroy();
  }
}

// Vitest resolves the `pyodide` package to its TypeScript source, which makes
// the runtime look for its wasm and stdlib next to that source. Point it at the
// published package directory instead.
const pyodideRoot = dirname(
  createRequire(import.meta.url).resolve("pyodide/package.json"),
);

beforeAll(async () => {
  pyodide = await loadPyodide({ indexURL: pyodideRoot });
  pyodide.runPython("import json");
}, 120_000);

describe("python harness", () => {
  it("creates a usable namespace and calls the entry function", () => {
    const outcomes = runPython("def add(a, b):\n    return a + b\n", "add", [[1, 2], [3, 4]]);
    expect(outcomes).toStrictEqual([{ ok: true, value: 3 }, { ok: true, value: 7 }]);
  });

  it("reports a missing entry function rather than throwing", () => {
    const outcomes = runPython("x = 1\n", "missing", [[]]);
    expect(outcomes[0]).toStrictEqual({ ok: false, error: "missing is not defined" });
  });

  it("reports a runtime error per case with its exception type", () => {
    const outcomes = runPython("def boom(n):\n    return 1 / n\n", "boom", [[1], [0]]);
    expect(outcomes[0]).toStrictEqual({ ok: true, value: 1 });
    expect(outcomes[1].ok).toBe(false);
    expect((outcomes[1] as { error: string }).error).toContain("ZeroDivisionError");
  });

  it("keeps one failing case from stopping the rest", () => {
    const outcomes = runPython("def f(n):\n    return 10 // n\n", "f", [[0], [5]]);
    expect(outcomes[0].ok).toBe(false);
    expect(outcomes[1]).toStrictEqual({ ok: true, value: 2 });
  });

  it("returns a Python tuple as an array so it compares with JavaScript", () => {
    const outcomes = runPython("def pair():\n    return (1, 2)\n", "pair", [[]]);
    expect(outcomes[0]).toStrictEqual({ ok: true, value: [1, 2] });
  });

  it("supports module-level imports in learner code", () => {
    const outcomes = runPython(
      "import math\n\n\ndef root(n):\n    return math.sqrt(n)\n",
      "root",
      [[9]],
    );
    expect(outcomes[0]).toStrictEqual({ ok: true, value: 3 });
  });
});

describe("every Python reference solution passes its own tests", () => {
  const withPython = problems.filter((problem) => problem.languages.python);

  it.each(withPython.map((problem) => [problem.slug, problem] as const))(
    "%s",
    (_slug, problem) => {
      const impl = problem.languages.python!;
      const outcomes = runPython(
        impl.solution,
        impl.entry,
        problem.tests.map((test) => test.args),
      );
      problem.tests.forEach((test, index) => {
        const outcome = outcomes[index];
        expect(outcome.ok, `${test.name}: ${outcome.ok ? "" : outcome.error}`).toBe(true);
        if (!outcome.ok) return;
        const mismatch = findMismatch(outcome.value, test.expected, toleranceFor(problem, test));
        expect(
          mismatch && `${test.name}: got ${mismatch.actual}, expected ${mismatch.expected}`,
        ).toBeNull();
      });
    },
  );
});

/**
 * Lesson snippets are presented as runnable, so at minimum they must parse as
 * Python. Compiling in Pyodide catches a typo or a broken f-string without
 * needing numpy and scikit-learn installed.
 */
describe("every lesson snippet is valid Python", () => {
  const snippets = lessons.flatMap((lesson) =>
    lesson.subtopics.flatMap((subtopic) => [
      [`${lesson.topicId}/${subtopic.id}`, subtopic.code.body] as const,
      ...(subtopic.code.variation
        ? [[`${lesson.topicId}/${subtopic.id} (variation)`, subtopic.code.variation.body] as const]
        : []),
    ]),
  );

  it.each(snippets)("%s", (_name, source) => {
    const globals = pyodide.globals.get("dict")();
    try {
      globals.set("__source", source);
      // compile() parses without executing, so no third-party imports are needed.
      pyodide.runPython("compile(__source, '<lesson>', 'exec')", { globals });
    } finally {
      globals.destroy();
    }
  });
});
