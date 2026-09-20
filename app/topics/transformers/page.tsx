import type { Metadata } from "next";
import { CoreLessonPage } from "../core-lesson";
import { coreLessons } from "@/data/core-lessons";

export const dynamic = "force-static";
export const metadata: Metadata = {
  title: coreLessons.transformers.title + " | Principal AI/ML Competency Matrix",
  description: coreLessons.transformers.subtitle,
};
export default function Page() { return <CoreLessonPage topicId="transformers" />; }
