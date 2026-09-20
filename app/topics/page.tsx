import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, NotebookPen } from "lucide-react";
import topicData from "@/data/topics.json";
import notebookIds from "@/data/notebooks.json";
import { problems } from "@/data/problems";
import { coreLessons } from "@/data/core-lessons";
import { SiteHeader } from "@/app/site-header";
import { TopicStatus } from "./topic-status";
import "./topics-index.css";

export const metadata: Metadata = {
  title: "Topics | Principal AI/ML Competency Matrix",
  description: "All 70 topics across 12 domains, with lessons, notebooks and practice problems.",
};

const notebooks = new Set<string>(notebookIds);

/** lin_reg keeps a bespoke lesson page; the rest are data-driven. */
const lessonIds = new Set(["lin_reg", ...Object.keys(coreLessons)]);

export default function TopicsPage() {
  const problemCounts = new Map<string, number>();
  for (const problem of problems) {
    for (const topicId of problem.topicIds) {
      problemCounts.set(topicId, (problemCounts.get(topicId) ?? 0) + 1);
    }
  }

  return <>
    <SiteHeader />
    <main id="main" className="topics-index">
      <section className="topics-heading">
        <div>
          <p className="eyebrow">CURRICULUM</p>
          <h1>Topics</h1>
          <p className="heading-copy">
            The full competency map. Each topic collects its lesson, notebook and practice
            problems; record the evidence level you can actually demonstrate.
          </p>
        </div>
        <Link href="/matrix" className="topics-matrix-link">
          Role priorities and roadmap <ArrowUpRight size={15} />
        </Link>
      </section>

      {topicData.domains.map((domain) => {
        const topics = topicData.skillsData.filter((topic) => topic.domain === domain.id);
        if (!topics.length) return null;
        return <section className="topics-domain" key={domain.id}>
          <div className="topics-domain-head">
            <div>
              <span className="section-layer">{domain.layer}</span>
              <h2>{domain.name}</h2>
            </div>
            <span className="topics-domain-count">{topics.length} topics</span>
          </div>
          <ul className="topics-grid">
            {topics.map((topic) => {
              const count = problemCounts.get(topic.id) ?? 0;
              return <li className="topics-card" key={topic.id}>
                <Link href={`/topics/${topic.id}`} className="topics-card-title">
                  {topic.title}
                </Link>
                <p>{topic.desc}</p>
                <div className="topics-card-foot">
                  <div className="topics-badges">
                    {lessonIds.has(topic.id) && <span className="badge-lesson">Lesson</span>}
                    {notebooks.has(topic.id) && (
                      <span className="badge-notebook"><NotebookPen size={12} /> Notebook</span>
                    )}
                    {count > 0 && (
                      <Link href={`/problems?topic=${topic.id}`} className="badge-problems">
                        {count} {count === 1 ? "problem" : "problems"}
                      </Link>
                    )}
                  </div>
                  <TopicStatus topicId={topic.id} title={topic.title} />
                </div>
              </li>;
            })}
          </ul>
        </section>;
      })}
    </main>
  </>;
}
