"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEVEL_OPTIONS, isLevel, useProgress } from "@/lib/progress";

export function TopicProgress({ topicId, title }: { topicId: string; title: string }) {
  const { level, setLevel } = useProgress();
  const [notice, setNotice] = useState("");
  const update = (value: string) => {
    if (!isLevel(value)) return;
    setNotice(setLevel(topicId, value)
      ? "Saved. Your tracker will show this level too."
      : "This browser could not save progress.");
  };
  return <div className="lesson-progress">
    <div><strong>Track your evidence</strong><p>Choose the highest level you can demonstrate with a concrete example.</p></div>
    <div className="lesson-progress-control"><Select value={level(topicId)} onValueChange={update}><SelectTrigger aria-label={`Evidence level for ${title}`} className="control-select"><SelectValue /></SelectTrigger><SelectContent>{LEVEL_OPTIONS.map(([id, label]) => <SelectItem value={id} key={id}>{label}</SelectItem>)}</SelectContent></Select>{notice && <span role="status">{notice}</span>}</div>
  </div>;
}
