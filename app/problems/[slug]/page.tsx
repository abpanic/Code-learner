import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FlaskConical, Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import topicData from "@/data/topics.json";
import { getProblem, problems } from "@/data/problems";
import {
  LANGUAGE_LABELS,
  isPlaceholder,
  languagesOf,
  visibleTests,
  type Problem,
} from "@/data/problems/types";
import { TopicProgress } from "@/app/topics/topic-progress";
import "../../topics/lesson.css";
import "../problems.css";
import "./problem.css";

export const dynamic = "force-static";

export function generateStaticParams() {
  return problems.map((problem) => ({ slug: problem.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const problem = getProblem(slug);
  if (!problem) return { title: "Problem not found" };
  return {
    title: `${problem.title} | Problems`,
    description: problem.prompt.split("\n")[0],
  };
}

const topicTitles = new Map(topicData.skillsData.map((topic) => [topic.id, topic.title]));

/**
 * The three link slots. They render even while unresolved, so the space is
 * visibly reserved rather than silently missing — and a `<placeholder>` never
 * becomes a dead anchor.
 */
function PlaceholderLinks({ problem }: { problem: Problem }) {
  const slots = [
    ["Theory", problem.links.theory],
    ["Explanation", problem.links.explanation],
    ["Learn more", problem.links.learnMore],
  ] as const;
  return <div className="link-slots">
    <strong>Go deeper</strong>
    <div>
      {slots.map(([label, href]) => isPlaceholder(href)
        ? <span className="link-slot link-slot-empty" key={label} title="No link chosen yet">
            <Lock size={13} aria-hidden="true" /> {label}
          </span>
        : <a className="link-slot" key={label} href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>)}
    </div>
  </div>;
}

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const problem = getProblem(slug);
  if (!problem) notFound();

  const languages = languagesOf(problem);
  const shown = visibleTests(problem);
  const hiddenCount = problem.tests.length - shown.length;
  const primaryTopic = problem.topicIds[0];

  return <main className="problems-shell">
    <header className="lesson-topbar">
      <div className="lesson-topbar-inner">
        <Link href="/" className="lesson-brand">
          <span className="brand-mark">AI<span className="brand-dot">·</span>ML</span>
          <span>Competency Matrix</span>
        </Link>
        <Link href="/problems" className="lesson-back"><ArrowLeft size={16} /> All problems</Link>
      </div>
    </header>

    <div className="problem-detail">
      <nav aria-label="Breadcrumb" className="lesson-breadcrumb">
        <Link href="/">Skills explorer</Link><span>/</span>
        <Link href="/problems">Problems</Link><span>/</span>
        <strong>{problem.title}</strong>
      </nav>

      <div className="problem-head">
        <div>
          <h1>{problem.title}</h1>
          <div className="problem-meta">
            <span className={`difficulty difficulty-${problem.difficulty}`}>
              {problem.difficulty[0].toUpperCase() + problem.difficulty.slice(1)}
            </span>
            {problem.topicIds.map((id) => (
              <Link className="topic-chip" href={`/problems?topic=${id}`} key={id}>
                {topicTitles.get(id) ?? id}
              </Link>
            ))}
            {problem.tags.map((tag) => <span className="tag-chip" key={tag}>{tag}</span>)}
          </div>
        </div>
      </div>

      <div className="problem-body">
        <section className="problem-prompt">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.prompt}</ReactMarkdown>
          <PlaceholderLinks problem={problem} />
        </section>

        <section className="problem-code" aria-label="Starter code">
          <div className="runner-notice" role="note">
            <FlaskConical size={16} aria-hidden="true" />
            <p>
              The in-browser editor and test runner arrive in the next phase. Until then,
              copy the starter into your own environment — the cases below are the ones it
              will be graded against.
            </p>
          </div>
          {languages.map((language) => {
            const impl = problem.languages[language]!;
            return <div className="starter-block" key={language}>
              <div className="starter-head">
                <strong>{LANGUAGE_LABELS[language]}</strong>
                <code>{impl.entry}</code>
              </div>
              <pre><code>{impl.starter.trimEnd()}</code></pre>
            </div>;
          })}
        </section>
      </div>

      <section className="problem-tests" aria-label="Test cases">
        <h2>Test cases</h2>
        <table>
          <thead>
            <tr><th scope="col">Case</th><th scope="col">Arguments</th><th scope="col">Expected</th></tr>
          </thead>
          <tbody>
            {shown.map((test) => <tr key={test.name}>
              <td>{test.name}</td>
              <td><code>{test.args.map((arg) => JSON.stringify(arg)).join(", ")}</code></td>
              <td><code>{JSON.stringify(test.expected)}</code></td>
            </tr>)}
          </tbody>
        </table>
        {hiddenCount > 0 && (
          <p className="tests-hidden">
            Plus {hiddenCount} hidden {hiddenCount === 1 ? "case" : "cases"} that run on submit.
          </p>
        )}
        {problem.tolerance !== undefined && (
          <p className="tests-hidden">
            Numeric answers are compared to a tolerance of {problem.tolerance}.
          </p>
        )}
      </section>

      {primaryTopic && (
        <TopicProgress topicId={primaryTopic} title={topicTitles.get(primaryTopic) ?? primaryTopic} />
      )}

      <Link href="/problems" className="lesson-end-link">
        <ArrowLeft size={16} /> Back to all problems
      </Link>
    </div>
  </main>;
}
