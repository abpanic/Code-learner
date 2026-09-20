import { describe, expect, it } from "vitest";
import {
  LIMITS,
  countWords,
  estimateMinutes,
  lessons,
  readingLoad,
  subtopicWords,
  validateLessons,
  type Subtopic,
  type TopicLesson,
} from "./index";

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

function subtopic(over: Partial<Subtopic> = {}): Subtopic {
  return {
    id: "a-lesson",
    title: "A lesson",
    summary: "One idea stated once.",
    minutes: 2,
    links: { theory: "<placeholder>", explanation: "<placeholder>", learnMore: "<placeholder>" },
    sections: [
      { id: "one", heading: "One", body: words(120) },
      { id: "two", heading: "Two", body: words(120) },
      { id: "three", heading: "Three", body: words(120) },
    ],
    questions: [
      { question: "Q1?", answer: "A1." },
      { question: "Q2?", answer: "A2." },
    ],
    ...over,
  };
}

function lesson(over: Partial<TopicLesson> = {}): TopicLesson {
  return {
    topicId: "lin_reg",
    overview: words(200),
    subtopics: [subtopic(), subtopic({ id: "another-lesson" })],
    ...over,
  };
}

describe("the shipped content", () => {
  it("passes every rule", () => {
    expect(validateLessons(lessons)).toStrictEqual([]);
  });

  it("keeps each sub-topic inside the size budget", () => {
    for (const topic of lessons) {
      for (const sub of topic.subtopics) {
        const count = subtopicWords(sub);
        expect(count, `${topic.topicId}/${sub.id}`).toBeLessThanOrEqual(LIMITS.subtopic.words);
        expect(count, `${topic.topicId}/${sub.id}`).toBeGreaterThanOrEqual(LIMITS.subtopicMin.words);
        expect(sub.sections.length).toBeLessThanOrEqual(LIMITS.subtopic.sections);
      }
    }
  });
});

describe("word counting", () => {
  it("ignores display maths", () => {
    expect(countWords("one two $$\\sum_{i=1}^{n} x_i$$ three")).toBe(3);
  });

  it("ignores fenced code", () => {
    expect(countWords("before\n```python\nmodel = fit(x, y)\n```\nafter")).toBe(2);
  });

  it("keeps link text but drops the URL", () => {
    expect(countWords("see [the docs](https://example.com/a/b)")).toBe(3);
  });

  it("counts a callout toward the sub-topic total", () => {
    const withCallout = subtopic({
      sections: [{ id: "one", heading: "One", body: words(10), callout: { title: "T", body: words(10) } }],
    });
    expect(subtopicWords(withCallout)).toBe(22);
  });
});

describe("reading load", () => {
  it("charges for display equations that words alone miss", () => {
    const plain = subtopic({ sections: [{ id: "one", heading: "H", body: words(100) }] });
    const mathy = subtopic({
      sections: [{ id: "one", heading: "H", body: `${words(100)}\n\n$$a = b$$\n\n$$c = d$$` }],
    });
    expect(subtopicWords(mathy)).toBe(subtopicWords(plain));
    expect(readingLoad(mathy)).toBeGreaterThan(readingLoad(plain));
  });

  it("rounds to at least a minute", () => {
    expect(estimateMinutes(10)).toBe(1);
  });
});

describe("validation rejects", () => {
  const errorsFor = (over: Partial<TopicLesson>) => validateLessons([lesson(over)]).join(" | ");

  it("an unknown topic id", () => {
    expect(errorsFor({ topicId: "not_a_topic" })).toContain("unknown topic id");
  });

  it("an over-long sub-topic, naming it", () => {
    const long = subtopic({
      id: "far-too-long",
      sections: [{ id: "one", heading: "One", body: words(950) }],
    });
    const message = errorsFor({ subtopics: [long, subtopic({ id: "ok-lesson" })] });
    expect(message).toContain("lin_reg/far-too-long");
    expect(message).toContain("exceeds the 900-word limit");
  });

  it("a sub-topic too short to be a lesson", () => {
    const stub = subtopic({
      id: "a-stub",
      sections: [{ id: "one", heading: "One", body: words(20) }],
    });
    expect(errorsFor({ subtopics: [stub, subtopic()] })).toContain("fold it into a neighbouring");
  });

  it("a seventh section", () => {
    const wide = subtopic({
      sections: Array.from({ length: 7 }, (_, i) => ({
        id: `s${i}`, heading: "H", body: words(50),
      })),
    });
    expect(errorsFor({ subtopics: [wide, subtopic({ id: "ok-lesson" })] })).toContain("sections exceeds 6");
  });

  it('a summary containing "and"', () => {
    const vague = subtopic({ summary: "Ridge regression and how to tune it." });
    expect(errorsFor({ subtopics: [vague, subtopic({ id: "ok-lesson" })] }))
      .toContain('summary contains "and"');
  });

  it("a missing link slot", () => {
    const noLinks = subtopic({
      links: { theory: "<placeholder>", explanation: "", learnMore: "<placeholder>" },
    });
    expect(errorsFor({ subtopics: [noLinks, subtopic({ id: "ok-lesson" })] }))
      .toContain("links.explanation is missing");
  });

  it("a minutes estimate that does not match the content", () => {
    const wrong = subtopic({ minutes: 8 });
    expect(errorsFor({ subtopics: [wrong, subtopic({ id: "ok-lesson" })] })).toContain("reads as");
  });

  it("a raw URL in the body", () => {
    const linky = subtopic({
      sections: [
        { id: "one", heading: "One", body: `${words(120)} https://example.com` },
        { id: "two", heading: "Two", body: words(120) },
        { id: "three", heading: "Three", body: words(120) },
      ],
    });
    expect(errorsFor({ subtopics: [linky, subtopic({ id: "ok-lesson" })] })).toContain("raw URL");
  });

  it("a problem that is not filed under this topic", () => {
    const mismatched = subtopic({ problemSlugs: ["sigmoid"] });
    expect(errorsFor({ subtopics: [mismatched, subtopic({ id: "ok-lesson" })] }))
      .toContain("is not listed under this topic");
  });

  it("an unknown problem slug", () => {
    const missing = subtopic({ problemSlugs: ["no-such-problem"] });
    expect(errorsFor({ subtopics: [missing, subtopic({ id: "ok-lesson" })] }))
      .toContain('unknown problem "no-such-problem"');
  });

  it("a topic with only one sub-topic", () => {
    expect(errorsFor({ subtopics: [subtopic()] })).toContain("1 sub-topics, expected 2-6");
  });

  it("an overview written as a summary rather than a map", () => {
    expect(errorsFor({ overview: words(600) })).toContain("it is a map, not a summary");
  });

  it("duplicate sub-topic ids", () => {
    expect(errorsFor({ subtopics: [subtopic(), subtopic()] })).toContain("ids must be unique");
  });
});

describe("validation accepts", () => {
  it("a well-formed lesson", () => {
    expect(validateLessons([lesson()])).toStrictEqual([]);
  });
});
