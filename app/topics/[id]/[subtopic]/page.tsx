import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import topicData from "@/data/topics.json";
import { allSubtopicParams, getSubtopic, getTopicLesson, subtopicNeighbours } from "@/data/lessons";
import { getProblem } from "@/data/problems";
import { isPlaceholder } from "@/data/lessons/types";
import { NotebookViewer } from "@/app/notebook-viewer";
import { HEADINGS_UNDER_SECTION } from "@/app/markdown-headings";
import { LessonShell } from "../../lesson-shell";
import { MarkRead } from "./mark-read";
import "./subtopic.css";

export const dynamic = "force-static";

const topicTitles = new Map(topicData.skillsData.map((topic) => [topic.id, topic.title]));
const topicDomains = new Map(topicData.skillsData.map((topic) => [topic.id, topic.domainName]));

export function generateStaticParams() {
  return allSubtopicParams();
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string; subtopic: string }> },
): Promise<Metadata> {
  const { id, subtopic } = await params;
  const found = getSubtopic(id, subtopic);
  if (!found) return { title: "Lesson not found" };
  return {
    title: `${found.title} | ${topicTitles.get(id) ?? id}`,
    description: found.summary,
  };
}

export default async function SubtopicPage(
  { params }: { params: Promise<{ id: string; subtopic: string }> },
) {
  const { id, subtopic } = await params;
  const lesson = getTopicLesson(id);
  const found = getSubtopic(id, subtopic);
  if (!lesson || !found) notFound();

  const { previous, next, position, total } = subtopicNeighbours(id, subtopic);
  const topicTitle = topicTitles.get(id) ?? id;
  const problems = (found.problemSlugs ?? [])
    .map((slug) => getProblem(slug))
    .filter((problem) => problem !== undefined);

  const contents: [string, string][] = [
    ...found.sections.map((section) => [section.id, section.heading] as [string, string]),
    ["practice", "Check understanding"],
    ...(problems.length > 0 ? [["problems", "Practice problems"] as [string, string]] : []),
    ...(found.notebookId ? [["notebook", "Python notebook"] as [string, string]] : []),
  ];

  return <LessonShell
    topicId={id}
    title={found.title}
    eyebrow={`${topicDomains.get(id) ?? "Topic"} · ${position} of ${total}`}
    subtitle={found.summary}
    tags={[topicTitle]}
    ctaNote={`About ${found.minutes} minutes.`}
    contents={contents}
    note={`Part of ${topicTitle}. ${total} lessons in this topic.`}
    sources={[]}
    back={{ href: `/topics/${id}`, label: topicTitle }}
    breadcrumb={[{ href: `/topics/${id}`, label: topicTitle }]}
    neighbours={{
      previous: previous
        ? { href: `/topics/${id}/${previous.id}`, title: previous.title }
        : { href: `/topics/${id}`, title: `${topicTitle} overview` },
      next: next ? { href: `/topics/${id}/${next.id}`, title: next.title } : undefined,
    }}
  >
    {found.sections.map((section) => (
      <section id={section.id} className="lesson-section" key={section.id}>
        <h2>{section.heading}</h2>
        <div className="core-markdown">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={HEADINGS_UNDER_SECTION}
          >
            {section.body}
          </ReactMarkdown>
        </div>
        {section.callout && (
          <div className="lesson-callout">
            <strong>{section.callout.title}</strong>
            <p>{section.callout.body}</p>
          </div>
        )}
      </section>
    ))}

    <section id="practice" className="lesson-section">
      <h2>Check your understanding</h2>
      <div className="practice-list">
        {found.questions.map((item, index) => (
          <div key={item.question}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><h3>{item.question}</h3><p>{item.answer}</p></div>
          </div>
        ))}
      </div>
    </section>

    {problems.length > 0 && (
      <section id="problems" className="lesson-section">
        <h2>Practice problems</h2>
        <ul className="subtopic-problems">
          {problems.map((problem) => (
            <li key={problem.slug}>
              <Link href={`/problems/${problem.slug}`}>
                {problem.title} <ArrowUpRight size={15} />
              </Link>
              <span className={`difficulty difficulty-${problem.difficulty}`}>
                {problem.difficulty[0].toUpperCase() + problem.difficulty.slice(1)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    )}

    {found.notebookId && (
      <section id="notebook" className="lesson-section lesson-notebook">
        <h2>Python notebook</h2>
        <NotebookViewer topicId={found.notebookId} title={found.title} available />
      </section>
    )}

    <div className="subtopic-links">
      <strong>Go deeper</strong>
      <div>
        {([["Theory", found.links.theory], ["Explanation", found.links.explanation], ["Learn more", found.links.learnMore]] as const)
          .map(([label, href]) => isPlaceholder(href)
            ? <span className="link-slot link-slot-empty" key={label}>{label}</span>
            : <a className="link-slot" key={label} href={href} target="_blank" rel="noopener noreferrer">{label}</a>)}
      </div>
    </div>

    <MarkRead topicId={id} subtopicId={subtopic} />
  </LessonShell>;
}
