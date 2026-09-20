"use client";

import Link from "next/link";
import { ArrowRight, Check, Clock } from "lucide-react";
import { useHydrated } from "@/lib/progress";
import { useReadLessons } from "@/lib/lessons";

export type SubtopicCard = { id: string; title: string; summary: string; minutes: number };

/** The topic map's list. Read state is per browser, so it hydrates in. */
export function SubtopicList({
  topicId,
  subtopics,
}: {
  topicId: string;
  subtopics: SubtopicCard[];
}) {
  const { isRead, countRead } = useReadLessons();
  const ready = useHydrated();
  const done = ready ? countRead(topicId, subtopics.map((s) => s.id)) : 0;

  return <section className="subtopic-map" aria-labelledby="lessons-heading">
    <div className="subtopic-map-head">
      <h2 id="lessons-heading">Lessons</h2>
      <span>{ready ? `${done} of ${subtopics.length} read` : `${subtopics.length} lessons`}</span>
    </div>
    <ol className="subtopic-cards">
      {subtopics.map((subtopic, index) => {
        const read = ready && isRead(topicId, subtopic.id);
        return <li key={subtopic.id} className={read ? "subtopic-card subtopic-read" : "subtopic-card"}>
          <Link href={`/topics/${topicId}/${subtopic.id}`}>
            <span className="subtopic-index" aria-hidden="true">
              {read ? <Check size={15} /> : String(index + 1).padStart(2, "0")}
            </span>
            <span className="subtopic-body">
              <strong>{subtopic.title}</strong>
              <span className="subtopic-summary">{subtopic.summary}</span>
              <span className="subtopic-time">
                <Clock size={12} aria-hidden="true" /> {subtopic.minutes} min
                {read && <span className="subtopic-read-tag">read</span>}
              </span>
            </span>
            <ArrowRight size={17} className="subtopic-arrow" aria-hidden="true" />
          </Link>
        </li>;
      })}
    </ol>
  </section>;
}
