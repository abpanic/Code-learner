import type { Metadata } from "next";
import { problems } from "@/data/problems";
import { SiteHeader } from "@/app/site-header";
import { ReviewList } from "./review-list";
import "./review.css";

export const metadata: Metadata = {
  title: "Review | Principal AI/ML Competency Matrix",
  description: "Problems you solved a while ago and are worth solving again.",
};

const titles = Object.fromEntries(problems.map((problem) => [problem.slug, problem.title]));

export default function ReviewPage() {
  return <>
    <SiteHeader back={{ href: "/", label: "Dashboard" }} />
    <main id="main" className="review-page">
      <header className="review-heading">
        <p className="eyebrow">SPACED PRACTICE</p>
        <h1>Review</h1>
        <p className="heading-copy">
          Solving once is not remembering. Problems return on a widening schedule so the
          second and third attempts land when they are actually useful.
        </p>
      </header>
      <ReviewList titles={titles} />
    </main>
  </>;
}
