/**
 * Lesson content model.
 *
 * A topic is a map, not a lesson: a short overview plus an ordered list of
 * sub-topics. Each sub-topic is one idea on one page, sized so it can be read
 * in a sitting. The limits below are enforced at module load (see ./index.ts),
 * so an over-long draft fails `pnpm build` rather than quietly shipping.
 */

export const PLACEHOLDER = "<placeholder>" as const;

/** Words per minute used to sanity-check a sub-topic's `minutes`. */
export const READING_SPEED_WPM = 180;

export const LIMITS = {
  subtopic: { words: 900, sections: 6, questions: 4, minutes: 8 },
  subtopicMin: { words: 250, sections: 3, questions: 2, minutes: 3 },
  overview: { words: 500 },
  overviewMin: { words: 150 },
  subtopicsPerTopic: { min: 2, max: 6 },
} as const;

export type LessonSection = {
  /** Anchor, kebab-case, unique within the sub-topic. */
  id: string;
  heading: string;
  /** Markdown. Inline maths with `$…$`, display with `$$…$$`. */
  body: string;
  callout?: { title: string; body: string };
};

export type LessonLinks = {
  theory: string;
  explanation: string;
  learnMore: string;
};

export type Subtopic = {
  /** Unique within its topic, kebab-case. Becomes the URL segment. */
  id: string;
  title: string;
  /** One line for the topic map. If it needs "and", this is two sub-topics. */
  summary: string;
  /** Reading estimate; checked against the measured word count. */
  minutes: number;
  sections: LessonSection[];
  questions: { question: string; answer: string }[];
  links: LessonLinks;
  /** Problems that exercise this idea specifically. */
  problemSlugs?: string[];
  /** Set when a notebook belongs to this sub-topic rather than the topic. */
  notebookId?: string;
};

export type TopicLesson = {
  /** Must match an id in data/topics.json. */
  topicId: string;
  /** Markdown framing for the topic map. */
  overview: string;
  subtopics: Subtopic[];
};

/**
 * Word count used by the size rule.
 *
 * Markdown syntax, code fences and maths are stripped first: a display
 * equation is not reading load in the way prose is, and counting it would
 * push authors to write less explanation around their formulas rather than
 * more.
 */
export function countWords(markdown: string): number {
  const prose = markdown
    .replace(/```[\s\S]*?```/g, " ")      // fenced code
    .replace(/\$\$[\s\S]*?\$\$/g, " ")    // display maths
    .replace(/\$[^$\n]*\$/g, " ")         // inline maths
    .replace(/`[^`\n]*`/g, " ")           // inline code
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // links keep their text
    .replace(/[#*_>|-]+/g, " ");
  return (prose.match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).length;
}

/** Total prose in a sub-topic: headings, bodies, callouts. */
export function subtopicWords(subtopic: Subtopic): number {
  return subtopic.sections.reduce(
    (total, section) =>
      total
      + countWords(section.heading)
      + countWords(section.body)
      + (section.callout ? countWords(section.callout.title) + countWords(section.callout.body) : 0),
    0,
  );
}

/**
 * Display equations and code blocks are reading load without being prose, so
 * the minute estimate charges for them. The word limit deliberately does not:
 * it exists to constrain explanation, and counting formulas against it would
 * push authors to write less prose around their maths rather than more.
 */
export const EQUATION_WORDS = 40;
export const CODE_LINE_WORDS = 8;

export function readingLoad(subtopic: Subtopic): number {
  let load = subtopicWords(subtopic);
  for (const section of subtopic.sections) {
    load += (section.body.match(/\$\$[\s\S]*?\$\$/g) ?? []).length * EQUATION_WORDS;
    for (const fence of section.body.match(/```[\s\S]*?```/g) ?? []) {
      load += fence.split("\n").length * CODE_LINE_WORDS;
    }
  }
  return load;
}

export function estimateMinutes(words: number): number {
  return Math.max(1, Math.round(words / READING_SPEED_WPM));
}

export function isPlaceholder(url: string): boolean {
  return url === PLACEHOLDER;
}
