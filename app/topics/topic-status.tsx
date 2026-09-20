"use client";

import { LEVEL_LABELS, useHydrated, useProgress } from "@/lib/progress";

/** Read-only evidence badge; the control itself lives on the topic page. */
export function TopicStatus({ topicId, title }: { topicId: string; title: string }) {
  const { level } = useProgress();
  const ready = useHydrated();
  const current = level(topicId);
  if (!ready) return <span className="level-tag level-todo">—</span>;
  return <span className={`level-tag level-${current}`} title={`Evidence for ${title}`}>
    {LEVEL_LABELS[current]}
  </span>;
}
