import topicData from "@/data/topics.json";
import { LANGUAGES, type Problem } from "./types";
import { twoSumIndices } from "./two-sum-indices";
import { meanSquaredError } from "./mean-squared-error";
import { moveZeroes } from "./move-zeroes";
import { maxSubarraySum } from "./max-subarray-sum";
import { pairSumSorted } from "./pair-sum-sorted";
import { olsSlopeIntercept } from "./ols-slope-intercept";
import { rSquared } from "./r-squared";
import { sigmoid } from "./sigmoid";
import { binaryCrossEntropy } from "./binary-cross-entropy";
import { confusionCounts } from "./confusion-counts";

export * from "./types";

/**
 * Every problem on the site. Adding one means importing it here — the
 * validation below then runs at module load, which for a prerendered route
 * means `next build` fails rather than shipping a broken problem.
 */
const registry: Problem[] = [
  twoSumIndices,
  meanSquaredError,
  moveZeroes,
  maxSubarraySum,
  pairSumSorted,
  olsSlopeIntercept,
  rSquared,
  sigmoid,
  binaryCrossEntropy,
  confusionCounts,
];

const knownTopicIds = new Set(topicData.skillsData.map((topic) => topic.id));

/** Returns a list of human-readable problems with the data, empty if valid. */
export function validateProblems(problems: readonly Problem[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const problem of problems) {
    const where = `problem "${problem.slug}"`;

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(problem.slug)) {
      errors.push(`${where}: slug must be lowercase kebab-case`);
    }
    if (seen.has(problem.slug)) errors.push(`${where}: duplicate slug`);
    seen.add(problem.slug);

    if (problem.topicIds.length === 0) errors.push(`${where}: needs at least one topicId`);
    for (const topicId of problem.topicIds) {
      if (!knownTopicIds.has(topicId)) {
        errors.push(`${where}: unknown topicId "${topicId}"`);
      }
    }

    // The three link slots must exist even while unfilled, so the UI always
    // has somewhere to put them.
    for (const slot of ["theory", "explanation", "learnMore"] as const) {
      if (typeof problem.links[slot] !== "string" || problem.links[slot] === "") {
        errors.push(`${where}: links.${slot} is missing`);
      }
    }

    const languages = LANGUAGES.filter((language) => problem.languages[language]);
    if (languages.length === 0) errors.push(`${where}: needs at least one language`);
    for (const language of languages) {
      const impl = problem.languages[language]!;
      if (!impl.entry) errors.push(`${where} (${language}): entry is missing`);
      if (!impl.starter.includes(impl.entry)) {
        errors.push(`${where} (${language}): starter does not define "${impl.entry}"`);
      }
      if (!impl.solution.includes(impl.entry)) {
        errors.push(`${where} (${language}): solution does not define "${impl.entry}"`);
      }
    }

    if (problem.tests.length < 3) errors.push(`${where}: needs at least 3 test cases`);
    if (!problem.tests.some((test) => !test.hidden)) {
      errors.push(`${where}: needs at least one visible test case`);
    }
    const names = problem.tests.map((test) => test.name);
    if (new Set(names).size !== names.length) {
      errors.push(`${where}: test case names must be unique`);
    }
  }

  return errors;
}

const problemErrors = validateProblems(registry);
if (problemErrors.length > 0) {
  throw new Error(`Invalid problem data:\n  ${problemErrors.join("\n  ")}`);
}

export const problems: readonly Problem[] = registry;

export const problemsBySlug = new Map(problems.map((problem) => [problem.slug, problem]));

export function getProblem(slug: string): Problem | undefined {
  return problemsBySlug.get(slug);
}

export function problemsForTopic(topicId: string): Problem[] {
  return problems.filter((problem) => problem.topicIds.includes(topicId));
}
