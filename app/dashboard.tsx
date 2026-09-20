"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck,
  CircleDot,
  Flame,
  Layers,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { problems } from "@/data/problems";
import { DIFFICULTIES, type Difficulty } from "@/data/problems/types";
import { useAttempts } from "@/lib/attempts";
import { useHydrated, useProgress, evidenceScore } from "@/lib/progress";
import {
  continueWith,
  countsByDifficulty,
  countsByTopic,
  dueForReview,
  recentActivity,
  streakDays,
} from "@/lib/stats";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export type DomainSummary = { id: string; short: string; name: string; topicIds: string[] };

export function Dashboard({
  domains,
  topicTitles,
  problemTitles,
}: {
  domains: DomainSummary[];
  topicTitles: Record<string, string>;
  problemTitles: Record<string, string>;
}) {
  const router = useRouter();
  const { attempts } = useAttempts();
  const { level } = useProgress();
  const ready = useHydrated();

  // Legacy links from the original single-file tracker pointed at /?topic=<id>.
  useEffect(() => {
    const topic = new URLSearchParams(window.location.search).get("topic");
    if (topic) router.replace(`/matrix?topic=${encodeURIComponent(topic)}`);
  }, [router]);

  const byDifficulty = useMemo(() => countsByDifficulty(problems, attempts), [attempts]);
  const byTopic = useMemo(() => countsByTopic(problems, attempts), [attempts]);
  const streak = useMemo(() => (ready ? streakDays(attempts) : 0), [attempts, ready]);
  const due = useMemo(() => (ready ? dueForReview(attempts) : []), [attempts, ready]);
  const recent = useMemo(() => recentActivity(attempts, 6), [attempts]);
  const next = useMemo(() => continueWith(attempts), [attempts]);

  const solved = problems.filter((p) => attempts[p.slug]?.status === "solved").length;
  const withEvidence = Object.keys(topicTitles).filter((id) => evidenceScore(level(id)) > 0).length;
  const totalTopics = Object.keys(topicTitles).length;

  return <main id="main" className="dashboard">
    <section className="dash-hero">
      <div>
        <p className="eyebrow">YOUR LEARNING WORKSPACE</p>
        <h1>What should I work on next?</h1>
        <p className="heading-copy">
          Two separate signals: <strong>code</strong> is what your solutions actually pass,
          <strong> evidence</strong> is what you can demonstrate from real work.
        </p>
      </div>
      <div className="dash-hero-actions">
        <Button asChild><Link href="/problems">Browse problems <ArrowRight size={16} /></Link></Button>
        <Button asChild variant="outline"><Link href="/matrix">Open the matrix</Link></Button>
      </div>
    </section>

    {next ? (
      <Link href={`/problems/${next.slug}`} className="dash-continue">
        <span className="dash-continue-label"><RotateCcw size={15} /> Pick up where you left off</span>
        <strong>{problemTitles[next.slug] ?? next.slug}</strong>
        <span className="dash-continue-meta">
          {next.passed}/{next.total} passing · {next.runs} {next.runs === 1 ? "run" : "runs"}
        </span>
        <ArrowRight size={18} className="dash-continue-arrow" />
      </Link>
    ) : (
      <Link href="/problems" className="dash-continue dash-continue-empty">
        <span className="dash-continue-label"><CircleDot size={15} /> Nothing in progress</span>
        <strong>Start a problem</strong>
        <span className="dash-continue-meta">{problems.length} available</span>
        <ArrowRight size={18} className="dash-continue-arrow" />
      </Link>
    )}

    <section className="dash-tiles" aria-label="Summary">
      <article className="dash-tile">
        <span><Flame size={15} /> Streak</span>
        <strong>{ready ? streak : "—"}<em>{streak === 1 ? " day" : " days"}</em></strong>
        <small>Any run counts, not just a solve</small>
      </article>
      <article className="dash-tile">
        <span><Trophy size={15} /> Problems solved</span>
        <strong>{ready ? solved : "—"}<em> / {problems.length}</em></strong>
        <Progress
          value={problems.length ? (solved / problems.length) * 100 : 0}
          aria-label="Problems solved"
          className="dash-progress"
        />
      </article>
      <article className="dash-tile">
        <span><Layers size={15} /> Topics with evidence</span>
        <strong>{ready ? withEvidence : "—"}<em> / {totalTopics}</em></strong>
        <small>Self-reported on the matrix</small>
      </article>
      <article className="dash-tile">
        <span><CalendarCheck size={15} /> Due for review</span>
        <strong>{ready ? due.length : "—"}</strong>
        <small>{due.length ? "Solved a while ago — worth redoing" : "Nothing due"}</small>
      </article>
    </section>

    <div className="dash-split">
      <section className="dash-panel" aria-label="Solved by difficulty">
        <h2>By difficulty</h2>
        <div className="dash-bars">
          {DIFFICULTIES.map((difficulty) => {
            const { solved: done, total } = byDifficulty[difficulty];
            return <div className="dash-bar" key={difficulty}>
              <div>
                <strong className={`difficulty difficulty-${difficulty}`}>
                  {DIFFICULTY_LABELS[difficulty]}
                </strong>
                <span>{ready ? done : "—"} / {total}</span>
              </div>
              <Progress
                value={total ? (done / total) * 100 : 0}
                aria-label={`${DIFFICULTY_LABELS[difficulty]} solved`}
              />
            </div>;
          })}
        </div>
        {due.length > 0 && (
          <div className="dash-review">
            <strong>Ready for another pass</strong>
            <ul>
              {due.slice(0, 4).map((attempt) => (
                <li key={attempt.slug}>
                  <Link href={`/problems/${attempt.slug}`}>
                    {problemTitles[attempt.slug] ?? attempt.slug}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="dash-panel" aria-label="Recent activity">
        <h2>Recent activity</h2>
        {recent.length === 0 ? (
          <p className="dash-empty">No runs yet. Your last six will show up here.</p>
        ) : (
          <ul className="dash-activity">
            {recent.map((attempt) => (
              <li key={attempt.slug}>
                <span className={`status-pill status-${attempt.status}`}>
                  {attempt.status === "solved" ? "Solved" : "Attempted"}
                </span>
                <Link href={`/problems/${attempt.slug}`}>
                  {problemTitles[attempt.slug] ?? attempt.slug}
                </Link>
                <span className="dash-activity-meta">{attempt.passed}/{attempt.total}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>

    <section className="dash-panel" aria-label="Coverage by domain">
      <h2>Coverage by domain</h2>
      <p className="dash-note">
        Problems solved against problems available, alongside the evidence depth you recorded
        on the matrix. They measure different things on purpose.
      </p>
      <div className="dash-domains">
        {domains.map((domain) => {
          const totals = domain.topicIds.reduce(
            (acc, id) => {
              const counts = byTopic.get(id);
              return {
                solved: acc.solved + (counts?.solved ?? 0),
                total: acc.total + (counts?.total ?? 0),
                evidence: acc.evidence + evidenceScore(level(id)),
              };
            },
            { solved: 0, total: 0, evidence: 0 },
          );
          const depth = Math.round((totals.evidence / (domain.topicIds.length * 5)) * 100);
          return <div className="dash-domain" key={domain.id}>
            <div className="dash-domain-head">
              <strong>{domain.short}</strong>
              <span>
                {totals.total > 0
                  ? `${ready ? totals.solved : "—"}/${totals.total} problems`
                  : "no problems yet"}
              </span>
            </div>
            <Progress value={ready ? depth : 0} aria-label={`${domain.short} evidence depth`} />
            <small>{ready ? depth : 0}% evidence depth · {domain.topicIds.length} topics</small>
          </div>;
        })}
      </div>
    </section>
  </main>;
}
