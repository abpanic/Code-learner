/**
 * Problem schema for the practice site.
 *
 * Every item is code-first: a starter, a reference solution and test cases.
 * Theory, explanation and further reading are links only — they ship as the
 * literal `PLACEHOLDER` token until real URLs are chosen, so the slot is
 * visible in the UI and fillable later without a schema change.
 */

export const PLACEHOLDER = "<placeholder>" as const;

export type Difficulty = "easy" | "medium" | "hard";

export type Language = "python" | "javascript";

export const LANGUAGES: Language[] = ["python", "javascript"];

export const LANGUAGE_LABELS: Record<Language, string> = {
  python: "Python",
  javascript: "JavaScript",
};

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export type TestCase = {
  /** Shown in the results list, so phrase it as the case being covered. */
  name: string;
  /** Positional arguments handed to the entry function. */
  args: unknown[];
  expected: unknown;
  /** Overrides the problem-level `tolerance` for this case. */
  tolerance?: number;
  /** Runs on submit rather than on every Run, to discourage hard-coding. */
  hidden?: boolean;
};

export type LanguageSolution = {
  /** What the editor opens with. Must define `entry` and fail the tests. */
  starter: string;
  /** Reference implementation. Must pass every test — asserted in CI. */
  solution: string;
  /** Function the harness calls. */
  entry: string;
};

export type ProblemLinks = {
  theory: string;
  explanation: string;
  learnMore: string;
};

export type Problem = {
  /** URL segment and attempt-store key. Stable forever once published. */
  slug: string;
  title: string;
  difficulty: Difficulty;
  /** Topic ids from data/topics.json. At least one. */
  topicIds: string[];
  tags: string[];
  /** Short markdown. No derivations — those are what the links are for. */
  prompt: string;
  links: ProblemLinks;
  languages: Partial<Record<Language, LanguageSolution>>;
  /**
   * Absolute tolerance applied to every numeric comparison in this problem.
   * Required for anything returning floats — exact equality on floats is a
   * bug, not strictness. Omit for problems that return ints, lists or strings.
   */
  tolerance?: number;
  tests: TestCase[];
  hints: string[];
};

/** A link that has not been filled in yet. */
export function isPlaceholder(url: string): boolean {
  return url === PLACEHOLDER;
}

export function languagesOf(problem: Problem): Language[] {
  return LANGUAGES.filter((language) => problem.languages[language]);
}

export function visibleTests(problem: Problem): TestCase[] {
  return problem.tests.filter((test) => !test.hidden);
}

/** Tolerance in force for one case: the case's own value, else the problem's. */
export function toleranceFor(problem: Problem, test: TestCase): number | undefined {
  return test.tolerance ?? problem.tolerance;
}
