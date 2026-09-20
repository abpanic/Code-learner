import type { Metadata } from "next";
import topicData from "@/data/topics.json";
import { problems } from "@/data/problems";
import { SiteHeader } from "./site-header";
import { Dashboard, type DomainSummary } from "./dashboard";
import "./dashboard.css";

export const metadata: Metadata = {
  title: "Dashboard | Principal AI/ML Competency Matrix",
  description: "Track coding practice and demonstrable evidence across 70 AI/ML topics.",
};

const domains: DomainSummary[] = topicData.domains.map((domain) => ({
  id: domain.id,
  short: domain.short,
  name: domain.name,
  topicIds: topicData.skillsData.filter((t) => t.domain === domain.id).map((t) => t.id),
}));

const topicTitles = Object.fromEntries(
  topicData.skillsData.map((topic) => [topic.id, topic.title]),
);

const problemTitles = Object.fromEntries(
  problems.map((problem) => [problem.slug, problem.title]),
);

export default function Home() {
  return <>
    <SiteHeader />
    <Dashboard domains={domains} topicTitles={topicTitles} problemTitles={problemTitles} />
  </>;
}
