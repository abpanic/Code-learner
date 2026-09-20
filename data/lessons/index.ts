import topicData from "@/data/topics.json";
import { problems } from "@/data/problems";
import {
  LIMITS,
  countWords,
  estimateMinutes,
  readingLoad,
  subtopicWords,
  type Subtopic,
  type TopicLesson,
} from "./types";
import { linRegLesson } from "./lin_reg";

export * from "./types";

/**
 * Every topic that has lesson content. Adding one means importing it here; the
 * validation below runs at module load, so a lesson that breaks the size rule
 * fails `pnpm build` rather than shipping.
 */
const registry: TopicLesson[] = [linRegLesson];

const knownTopicIds = new Set(topicData.skillsData.map((topic) => topic.id));
const knownSlugs = new Set(problems.map((problem) => problem.slug));
const problemTopics = new Map(problems.map((problem) => [problem.slug, problem.topicIds]));

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RAW_URL = /https?:\/\//;

function checkSubtopic(lesson: TopicLesson, subtopic: Subtopic, errors: string[]) {
  const where = `${lesson.topicId}/${subtopic.id}`;

  if (!KEBAB.test(subtopic.id)) errors.push(`${where}: id must be kebab-case`);

  const words = subtopicWords(subtopic);
  if (words > LIMITS.subtopic.words) {
    errors.push(
      `${where}: ${words} words exceeds the ${LIMITS.subtopic.words}-word limit`
      + " — split it (see plan.md §3)",
    );
  }
  if (words < LIMITS.subtopicMin.words) {
    errors.push(
      `${where}: only ${words} words — fold it into a neighbouring sub-topic`,
    );
  }

  if (subtopic.sections.length > LIMITS.subtopic.sections) {
    errors.push(`${where}: ${subtopic.sections.length} sections exceeds ${LIMITS.subtopic.sections}`);
  }
  if (subtopic.sections.length < LIMITS.subtopicMin.sections) {
    errors.push(`${where}: needs at least ${LIMITS.subtopicMin.sections} sections`);
  }

  const sectionIds = subtopic.sections.map((section) => section.id);
  if (new Set(sectionIds).size !== sectionIds.length) {
    errors.push(`${where}: section ids must be unique`);
  }
  for (const id of sectionIds) {
    if (!KEBAB.test(id)) errors.push(`${where}: section id "${id}" must be kebab-case`);
  }

  if (subtopic.questions.length > LIMITS.subtopic.questions
    || subtopic.questions.length < LIMITS.subtopicMin.questions) {
    errors.push(
      `${where}: ${subtopic.questions.length} questions, expected `
      + `${LIMITS.subtopicMin.questions}-${LIMITS.subtopic.questions}`,
    );
  }

  // The summary is what the topic map shows; "and" is the split smell.
  if (/\band\b/i.test(subtopic.summary)) {
    errors.push(`${where}: summary contains "and" — is this two sub-topics?`);
  }

  for (const slot of ["theory", "explanation", "learnMore"] as const) {
    if (typeof subtopic.links[slot] !== "string" || subtopic.links[slot] === "") {
      errors.push(`${where}: links.${slot} is missing`);
    }
  }

  const expected = estimateMinutes(readingLoad(subtopic));
  if (Math.abs(subtopic.minutes - expected) > 2) {
    errors.push(
      `${where}: minutes is ${subtopic.minutes} but the content reads as ~${expected}`,
    );
  }
  if (subtopic.minutes > LIMITS.subtopic.minutes) {
    errors.push(`${where}: ${subtopic.minutes} minutes exceeds ${LIMITS.subtopic.minutes}`);
  }

  for (const slug of subtopic.problemSlugs ?? []) {
    if (!knownSlugs.has(slug)) {
      errors.push(`${where}: unknown problem "${slug}"`);
    } else if (!problemTopics.get(slug)?.includes(lesson.topicId)) {
      errors.push(`${where}: problem "${slug}" is not listed under this topic`);
    }
  }

  for (const section of subtopic.sections) {
    if (RAW_URL.test(section.body)) {
      errors.push(`${where}/${section.id}: raw URL in the body — use the link slots`);
    }
  }
}

export function validateLessons(lessons: readonly TopicLesson[]): string[] {
  const errors: string[] = [];
  const seenTopics = new Set<string>();

  for (const lesson of lessons) {
    if (!knownTopicIds.has(lesson.topicId)) {
      errors.push(`lesson "${lesson.topicId}": unknown topic id`);
    }
    if (seenTopics.has(lesson.topicId)) {
      errors.push(`lesson "${lesson.topicId}": duplicate topic`);
    }
    seenTopics.add(lesson.topicId);

    const overviewWords = countWords(lesson.overview);
    if (overviewWords > LIMITS.overview.words) {
      errors.push(
        `${lesson.topicId}: overview is ${overviewWords} words, over the `
        + `${LIMITS.overview.words}-word limit — it is a map, not a summary`,
      );
    }
    if (overviewWords < LIMITS.overviewMin.words) {
      errors.push(`${lesson.topicId}: overview is only ${overviewWords} words`);
    }

    const { min, max } = LIMITS.subtopicsPerTopic;
    if (lesson.subtopics.length < min || lesson.subtopics.length > max) {
      errors.push(
        `${lesson.topicId}: ${lesson.subtopics.length} sub-topics, expected ${min}-${max}`,
      );
    }

    const ids = lesson.subtopics.map((subtopic) => subtopic.id);
    if (new Set(ids).size !== ids.length) {
      errors.push(`${lesson.topicId}: sub-topic ids must be unique`);
    }

    for (const subtopic of lesson.subtopics) checkSubtopic(lesson, subtopic, errors);
  }

  return errors;
}

const lessonErrors = validateLessons(registry);
if (lessonErrors.length > 0) {
  throw new Error(`Invalid lesson content:\n  ${lessonErrors.join("\n  ")}`);
}

export const lessons: readonly TopicLesson[] = registry;

const byTopic = new Map(lessons.map((lesson) => [lesson.topicId, lesson]));

export function getTopicLesson(topicId: string): TopicLesson | undefined {
  return byTopic.get(topicId);
}

export function hasLesson(topicId: string): boolean {
  return byTopic.has(topicId);
}

export function getSubtopic(topicId: string, subtopicId: string): Subtopic | undefined {
  return byTopic.get(topicId)?.subtopics.find((subtopic) => subtopic.id === subtopicId);
}

/** Previous and next sub-topic within a topic, for the lesson footer. */
export function subtopicNeighbours(topicId: string, subtopicId: string) {
  const list = byTopic.get(topicId)?.subtopics ?? [];
  const index = list.findIndex((subtopic) => subtopic.id === subtopicId);
  return {
    previous: index > 0 ? list[index - 1] : undefined,
    next: index >= 0 ? list[index + 1] : undefined,
    position: index + 1,
    total: list.length,
  };
}

/** Every `topicId/subtopicId` pair, for static generation. */
export function allSubtopicParams() {
  return lessons.flatMap((lesson) =>
    lesson.subtopics.map((subtopic) => ({ id: lesson.topicId, subtopic: subtopic.id })),
  );
}
