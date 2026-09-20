import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, NotebookPen } from "lucide-react";
import { NavigationReset } from "./navigation-reset";
import { SiteHeader } from "@/app/site-header";
import { TopicProgress } from "./topic-progress";
import "./lesson.css";
import "./core-lesson.css";

export type LessonSource = { label: string; url: string };

/** Explicit previous/next, used by sub-topic pages. */
export type LessonNeighbour = { href: string; title: string };

/**
 * Chrome shared by every Core ML lesson: topbar, breadcrumb, heading, the
 * sticky table of contents, and the footer (progress control, neighbour links,
 * further reading). Sections come in as `children` so a lesson can supply
 * either markdown-rendered data or its own JSX.
 */
export function LessonShell({
  topicId,
  title,
  headline,
  eyebrow,
  subtitle,
  tags,
  ctaNote,
  contents,
  note,
  sources,
  neighbours,
  breadcrumb,
  back,
  children,
}: {
  topicId: string;
  /** Plain-text title used in the breadcrumb, progress label and neighbour links. */
  title: string;
  /** Display title for the h1; defaults to `title`. */
  headline?: ReactNode;
  eyebrow: string;
  subtitle: string;
  tags: readonly string[];
  ctaNote: string;
  contents: readonly (readonly [string, string])[];
  note: string;
  sources: readonly LessonSource[];
  neighbours: { previous?: LessonNeighbour; next?: LessonNeighbour };
  /** Trail between "Topics" and the title. */
  breadcrumb?: readonly { href?: string; label: string }[];
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  const { previous, next } = neighbours;
  return <main id="main" className="lesson-shell"><NavigationReset />
    <SiteHeader back={back ?? { href: "/topics", label: "All topics" }} />
    <div className="lesson-container">
      <nav aria-label="Breadcrumb" className="lesson-breadcrumb"><Link href="/topics">Topics</Link>{(breadcrumb ?? [{ label: "Core ML" }]).map(crumb => <span key={crumb.label} className="crumb"><span>/</span>{crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span>{crumb.label}</span>}</span>)}<span>/</span><strong>{title}</strong></nav>
      <div className="lesson-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{headline ?? title}</h1><p>{subtitle}</p><div className="lesson-pills">{tags.map(tag => <span key={tag}>{tag}</span>)}<span>Python notebook</span></div></div><div className="lesson-heading-actions"><a href="#notebook" className="lesson-cta"><NotebookPen size={17} /> Open notebook</a><span>{ctaNote}</span></div></div>
      <div className="lesson-layout">
        <aside className="lesson-side"><div className="lesson-side-card"><p>ON THIS PAGE</p>{contents.map(([id, label], i) => <a key={id} href={`#${id}`}><span>{String(i + 1).padStart(2, "0")}</span>{label}</a>)}</div><div className="lesson-side-note"><BookOpen size={18} /><p>{note}</p></div></aside>
        <div className="lesson-main">
          {children}
          <TopicProgress topicId={topicId} title={title} />
          <nav className="core-neighbors" aria-label="Lesson navigation">{previous ? <Link href={previous.href}><ArrowLeft size={16} /><span><small>PREVIOUS</small>{previous.title}</span></Link> : <span />}{next ? <Link href={next.href}><span><small>NEXT</small>{next.title}</span><ArrowRight size={16} /></Link> : <span />}</nav>
          {sources.length > 0 && <div className="core-sources"><strong>Further reading</strong><div>{sources.map(source => <a href={source.url} target="_blank" rel="noopener noreferrer" key={source.url}>{source.label}<ArrowUpRight size={14} /></a>)}</div></div>}
          <Link href="/topics" className="lesson-end-link"><ArrowLeft size={16} /> Back to all topics <ArrowUpRight size={16} /></Link>
        </div>
      </div>
    </div>
  </main>;
}
