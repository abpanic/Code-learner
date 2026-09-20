import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Lock } from "lucide-react";
import topicData from "@/data/topics.json";
import notebookIds from "@/data/notebooks.json";
import { coreLessons } from "@/data/core-lessons";
import { problemsForTopic } from "@/data/problems";
import { getTopicLesson } from "@/data/lessons";
import { SiteHeader } from "@/app/site-header";
import { NotebookViewer } from "@/app/notebook-viewer";
import { TopicProgress } from "../topic-progress";
import { SubtopicList } from "./subtopic-list";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HEADINGS_UNDER_TITLE } from "@/app/markdown-headings";
import "../lesson.css";
import "../../problems/problems.css";
import "./topic.css";
import "./topic-extra.css";

export const dynamic = "force-static";

/**
 * Covers every topic that does not have a hand-written lesson. The six Core ML
 * lessons live in their own folders, and Next prefers those static segments
 * over this dynamic one, so they are simply excluded here.
 */
// The five Core ML topics still on bespoke routes; C1 moves them into
// data/lessons and this set empties out.
const lessonIds = new Set(Object.keys(coreLessons));
const notebooks = new Set<string>(notebookIds);

const topics = topicData.skillsData.filter((topic) => !lessonIds.has(topic.id));
const byId = new Map(topics.map((topic) => [topic.id, topic]));

export function generateStaticParams() {
  return topics.map((topic) => ({ id: topic.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const topic = byId.get(id);
  if (!topic) return { title: "Topic not found" };
  return { title: `${topic.title} | Topics`, description: topic.desc };
}

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topic = byId.get(id);
  if (!topic) notFound();

  const lesson = getTopicLesson(topic.id);
  const related = problemsForTopic(topic.id);
  const hasNotebook = notebooks.has(topic.id);

  return <>
    <SiteHeader back={{ href: "/topics", label: "All topics" }} />
    <main id="main" className="topic-page">
      <nav aria-label="Breadcrumb" className="lesson-breadcrumb">
        <Link href="/topics">Topics</Link><span>/</span>
        <span>{topic.domainName}</span><span>/</span>
        <strong>{topic.title}</strong>
      </nav>

      <header className="topic-head">
        <p className="eyebrow">{topic.domainName}</p>
        <h1>{topic.title}</h1>
        <p className="topic-desc">{topic.desc}</p>
      </header>

      <div className="topic-columns">
        <div className="topic-main">
          {lesson && (
            <section className="topic-section">
              <div className="topic-overview">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={HEADINGS_UNDER_TITLE}>{lesson.overview}</ReactMarkdown>
              </div>
              <SubtopicList
                topicId={topic.id}
                subtopics={lesson.subtopics.map((subtopic) => ({
                  id: subtopic.id,
                  title: subtopic.title,
                  summary: subtopic.summary,
                  minutes: subtopic.minutes,
                }))}
              />
            </section>
          )}

          <section className="topic-section">
            <h2>Formula or decision rule</h2>
            <pre className="formula"><code>{topic.formula}</code></pre>
          </section>

          <section className="topic-section">
            <h2>Interview prompts</h2>
            <ul className="question-list">
              {topic.questions.map((question) => <li key={question}>{question}</li>)}
            </ul>
          </section>

          <section className="topic-section" id="problems">
            <h2>Practice problems</h2>
            {related.length === 0 ? (
              <p className="topic-empty">
                No problems for this topic yet.{" "}
                <Link href="/problems">Browse everything else</Link>.
              </p>
            ) : (
              <ul className="problem-list">
                {related.map((problem) => <li className="problem-row" key={problem.slug}>
                  <div className="problem-main">
                    <Link href={`/problems/${problem.slug}`} className="problem-title">
                      {problem.title} <ArrowUpRight size={15} />
                    </Link>
                    <div className="problem-meta">
                      {problem.tags.map((tag) => <span className="tag-chip" key={tag}>{tag}</span>)}
                    </div>
                  </div>
                  <span className={`difficulty difficulty-${problem.difficulty}`}>
                    {problem.difficulty[0].toUpperCase() + problem.difficulty.slice(1)}
                  </span>
                </li>)}
              </ul>
            )}
          </section>

          {hasNotebook && (
            <section className="topic-section" id="notebook">
              <h2>Python notebook</h2>
              <NotebookViewer topicId={topic.id} title={topic.title} available />
            </section>
          )}

          <TopicProgress topicId={topic.id} title={topic.title} />
        </div>

        <aside className="topic-side">
          <div className="link-slots">
            <strong>Go deeper</strong>
            <div>
              {["Theory", "Explanation", "Learn more"].map((label) => (
                <span className="link-slot link-slot-empty" key={label} title="No link chosen yet">
                  <Lock size={13} aria-hidden="true" /> {label}
                </span>
              ))}
            </div>
          </div>
          {!lesson && (
            <p className="topic-side-note">
              This topic has no written lesson yet. The prompts above come from the competency
              matrix; the links fill in as reading is chosen.
            </p>
          )}
          <Link href="/topics" className="lesson-end-link">
            <ArrowLeft size={16} /> All topics
          </Link>
        </aside>
      </div>
    </main>
  </>;
}
