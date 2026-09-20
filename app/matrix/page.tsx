import type { Metadata } from "next";
import Tracker from "@/app/tracker";

export const metadata: Metadata = {
  title: "Competency matrix | Principal AI/ML",
  description: "All 70 topics with role priorities, domain balance and the six-month roadmap.",
};

export default function MatrixPage() {
  return <Tracker />;
}
