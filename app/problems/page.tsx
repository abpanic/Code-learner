import type { Metadata } from "next";
import topicData from "@/data/topics.json";
import { SiteHeader } from "@/app/site-header";
import { problems } from "@/data/problems";
import { ProblemBrowser, type TopicOption } from "./problem-browser";
// The shared topbar styles live with the lesson pages for now; Phase 3 pulls
// the header into its own component when the IA changes.
import "../topics/lesson.css";
import "./problems.css";

export const metadata: Metadata = {
  title: "Problems | Principal AI/ML Competency Matrix",
  description: "Code-first practice problems with runnable tests, linked to the competency matrix.",
};

/** Only topics that actually have problems appear in the filter. */
function topicOptions(): TopicOption[] {
  const used = new Set(problems.flatMap((problem) => problem.topicIds));
  return topicData.skillsData
    .filter((topic) => used.has(topic.id))
    .map((topic) => ({ id: topic.id, name: topic.title }));
}

export default function ProblemsPage() {
  return <main className="problems-shell">
    <SiteHeader />
    <ProblemBrowser problems={[...problems]} topics={topicOptions()} />
  </main>;
}
