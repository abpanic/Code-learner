import type { Metadata } from "next";
import topicData from "@/data/topics.json";
import { problems } from "@/data/problems";
import { SiteHeader } from "@/app/site-header";
import { SettingsPanel } from "./settings-panel";
import "./settings.css";

export const metadata: Metadata = {
  title: "Settings | Principal AI/ML Competency Matrix",
  description: "Theme, backups and resets for your browser-local progress.",
};

export default function SettingsPage() {
  return <>
    <SiteHeader back={{ href: "/", label: "Dashboard" }} />
    <main id="main" className="settings-page">
      <header className="settings-heading">
        <p className="eyebrow">PREFERENCES</p>
        <h1>Settings</h1>
      </header>
      <SettingsPanel
        topicIds={topicData.skillsData.map((topic) => topic.id)}
        slugs={problems.map((problem) => problem.slug)}
      />
    </main>
  </>;
}
