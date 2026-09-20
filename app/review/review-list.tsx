"use client";

import Link from "next/link";
import { ArrowRight, CalendarCheck, CheckCircle2 } from "lucide-react";
import { useAttempts, REVIEW_INTERVALS_DAYS } from "@/lib/attempts";
import { useHydrated } from "@/lib/progress";
import { dueForReview } from "@/lib/stats";
import { Button } from "@/components/ui/button";

/** "3 days ago", "in 5 days" — enough precision for a review queue. */
function relativeDays(iso: string, now: Date): string {
  const days = Math.round((new Date(iso).getTime() - now.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === -1) return "yesterday";
  if (days === 1) return "tomorrow";
  return days < 0 ? `${-days} days ago` : `in ${days} days`;
}

export function ReviewList({ titles }: { titles: Record<string, string> }) {
  const { attempts } = useAttempts();
  const ready = useHydrated();
  const now = new Date();

  if (!ready) return <div className="review-list" aria-busy="true" />;

  const due = dueForReview(attempts, now);
  const scheduled = Object.values(attempts)
    .filter((a) => a.nextReviewAt && new Date(a.nextReviewAt) > now)
    .sort((a, b) => (a.nextReviewAt ?? "").localeCompare(b.nextReviewAt ?? ""));

  return <div className="review-list">
    {due.length === 0 ? (
      <div className="review-empty">
        <CheckCircle2 size={26} aria-hidden="true" />
        <h2>Nothing due right now</h2>
        <p>
          A solved problem comes back after {REVIEW_INTERVALS_DAYS.join(", then ")} days.
          {scheduled.length > 0
            ? ` ${scheduled.length} ${scheduled.length === 1 ? "problem is" : "problems are"} waiting.`
            : " Solve something to start the cycle."}
        </p>
        <Button asChild variant="outline"><Link href="/problems">Browse problems</Link></Button>
      </div>
    ) : (
      <>
        <p className="review-count" role="status">
          {due.length} {due.length === 1 ? "problem is" : "problems are"} ready for another pass.
        </p>
        <ul className="review-due">
          {due.map((attempt) => <li key={attempt.slug}>
            <div>
              <Link href={`/problems/${attempt.slug}`} className="review-title">
                {titles[attempt.slug] ?? attempt.slug}
              </Link>
              <p>
                Solved {relativeDays(attempt.firstSolvedAt ?? attempt.lastRunAt, now)}
                {" · "}due {relativeDays(attempt.nextReviewAt!, now)}
                {" · "}{attempt.runs} {attempt.runs === 1 ? "run" : "runs"}
              </p>
            </div>
            <Button asChild size="sm">
              <Link href={`/problems/${attempt.slug}`}>Redo <ArrowRight size={15} /></Link>
            </Button>
          </li>)}
        </ul>
      </>
    )}

    {scheduled.length > 0 && (
      <section className="review-upcoming" aria-label="Scheduled">
        <h2><CalendarCheck size={15} aria-hidden="true" /> Coming up</h2>
        <ul>
          {scheduled.slice(0, 8).map((attempt) => <li key={attempt.slug}>
            <Link href={`/problems/${attempt.slug}`}>{titles[attempt.slug] ?? attempt.slug}</Link>
            <span>{relativeDays(attempt.nextReviewAt!, now)}</span>
          </li>)}
        </ul>
      </section>
    )}
  </div>;
}
