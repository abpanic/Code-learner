"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, Check } from "lucide-react";
import { markRead, markUnread, useReadLessons } from "@/lib/lessons";
import { Button } from "@/components/ui/button";

/**
 * Marks the lesson read on arrival, and lets the reader undo that.
 *
 * Recorded on open rather than on scroll: the honest signal here is "I came to
 * this page", and a scroll threshold would just make short lessons count for
 * less than long ones.
 */
export function MarkRead({ topicId, subtopicId }: { topicId: string; subtopicId: string }) {
  const { isRead } = useReadLessons();
  const [ready, setReady] = useState(false);
  const read = isRead(topicId, subtopicId);

  useEffect(() => {
    markRead(topicId, subtopicId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only store, readable after hydration
    setReady(true);
  }, [topicId, subtopicId]);

  if (!ready) return <div className="mark-read" aria-hidden="true" />;

  return <div className="mark-read">
    {read ? (
      <>
        <span className="mark-read-done"><Check size={15} aria-hidden="true" /> Marked as read</span>
        <Button variant="ghost" size="sm" onClick={() => markUnread(topicId, subtopicId)}>
          Undo
        </Button>
      </>
    ) : (
      <Button variant="outline" size="sm" onClick={() => markRead(topicId, subtopicId)}>
        <BookOpenCheck size={15} /> Mark as read
      </Button>
    )}
  </div>;
}
