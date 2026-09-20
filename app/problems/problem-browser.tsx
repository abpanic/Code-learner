"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FilterX, Search } from "lucide-react";
import { DIFFICULTIES, languagesOf, type Difficulty, type Problem } from "@/data/problems/types";
import { LANGUAGE_LABELS } from "@/data/problems/types";
import { useAttempts, type AttemptStatus } from "@/lib/attempts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_LABELS: Record<AttemptStatus, string> = {
  unsolved: "Not started",
  attempted: "Attempted",
  solved: "Solved",
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export type TopicOption = { id: string; name: string };

/** Filter state is mirrored into the URL so a filtered list stays linkable. */
type Filters = { q: string; topic: string; difficulty: string; status: string };

const NO_FILTERS: Filters = { q: "", topic: "all", difficulty: "all", status: "all" };

function toQuery(filters: Filters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== "all") params.set(key, value);
  }
  return params.toString();
}

export function ProblemBrowser({
  problems,
  topics,
}: {
  problems: Problem[];
  topics: TopicOption[];
}) {
  const { statusOf } = useAttempts();
  // Starts unfiltered so the server renders the full list as real HTML, then
  // picks up any filters from the URL once hydrated.
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl: Filters = {
      q: params.get("q") ?? "",
      topic: params.get("topic") ?? "all",
      difficulty: params.get("difficulty") ?? "all",
      status: params.get("status") ?? "all",
    };
    // The URL can only be read after hydration, so this genuinely belongs in
    // an effect. Same pattern as the deep-link handling in app/tracker.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (toQuery(fromUrl)) setFilters(fromUrl);
  }, []);

  const topicNames = useMemo(
    () => new Map(topics.map((topic) => [topic.id, topic.name])),
    [topics],
  );

  const apply = (next: Filters) => {
    setFilters(next);
    const query = toQuery(next);
    window.history.replaceState(null, "", query ? `/problems?${query}` : "/problems");
  };
  const setFilter = (key: keyof Filters, value: string) => apply({ ...filters, [key]: value });
  const clearFilters = () => apply(NO_FILTERS);
  const hasFilters = toQuery(filters) !== "";

  const visible = problems.filter((problem) => {
    if (filters.topic !== "all" && !problem.topicIds.includes(filters.topic)) return false;
    if (filters.difficulty !== "all" && problem.difficulty !== filters.difficulty) return false;
    if (filters.status !== "all" && statusOf(problem.slug) !== filters.status) return false;
    if (filters.q.trim()) {
      const haystack = [
        problem.title,
        problem.prompt,
        problem.tags.join(" "),
        problem.topicIds.map((id) => topicNames.get(id) ?? "").join(" "),
      ].join(" ").toLowerCase();
      if (!haystack.includes(filters.q.trim().toLowerCase())) return false;
    }
    return true;
  });

  const solved = problems.filter((problem) => statusOf(problem.slug) === "solved").length;

  return <div className="problems-page">
    <section className="problems-heading">
      <div>
        <p className="eyebrow">PRACTICE</p>
        <h1>Problems</h1>
        <p className="heading-copy">
          Write the code, run it against the tests, and record what you can demonstrate.
          Explanations live behind the links on each problem.
        </p>
      </div>
      <div className="problems-score">
        <strong>{solved}<em> / {problems.length}</em></strong>
        <span>solved</span>
      </div>
    </section>

    <section className="problem-filters" aria-label="Filter problems">
      <div className="search-box">
        <Search size={17} aria-hidden="true" />
        <Input
          aria-label="Search problems"
          data-shortcut="search"
          placeholder="Search titles, tags, or topics"
          value={filters.q}
          onChange={(event) => setFilter("q", event.target.value)}
        />
      </div>
      <FilterSelect
        label="Filter by topic"
        value={filters.topic}
        onChange={(value) => setFilter("topic", value)}
        options={[["all", "All topics"], ...topics.map((t) => [t.id, t.name] as const)]}
      />
      <FilterSelect
        label="Filter by difficulty"
        value={filters.difficulty}
        onChange={(value) => setFilter("difficulty", value)}
        options={[
          ["all", "All difficulties"],
          ...DIFFICULTIES.map((d) => [d, DIFFICULTY_LABELS[d]] as const),
        ]}
      />
      <FilterSelect
        label="Filter by status"
        value={filters.status}
        onChange={(value) => setFilter("status", value)}
        options={[
          ["all", "All statuses"],
          ["unsolved", STATUS_LABELS.unsolved],
          ["attempted", STATUS_LABELS.attempted],
          ["solved", STATUS_LABELS.solved],
        ]}
      />
    </section>

    <div className="problems-results">
      <span>{visible.length} {visible.length === 1 ? "problem" : "problems"}</span>
      {hasFilters && (
        <Button variant="link" size="sm" onClick={clearFilters} className="clear-filters">
          Clear filters
        </Button>
      )}
    </div>

    {visible.length === 0 ? (
      <div className="empty-state">
        <FilterX size={24} />
        <h2>No problems match these filters</h2>
        <p>Try a different search, topic, or difficulty.</p>
        <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
      </div>
    ) : (
      <ul className="problem-list">
        {visible.map((problem) => {
          const status = statusOf(problem.slug);
          return <li key={problem.slug} className="problem-row">
            <span className={`status-pill status-${status}`}>{STATUS_LABELS[status]}</span>
            <div className="problem-main">
              <Link href={`/problems/${problem.slug}`} className="problem-title">
                {problem.title} <ArrowUpRight size={15} />
              </Link>
              <div className="problem-meta">
                {problem.topicIds.map((id) => (
                  <span className="topic-chip" key={id}>{topicNames.get(id) ?? id}</span>
                ))}
                {problem.tags.map((tag) => <span className="tag-chip" key={tag}>{tag}</span>)}
              </div>
            </div>
            <span className="problem-langs">
              {languagesOf(problem).map((language) => LANGUAGE_LABELS[language]).join(" · ")}
            </span>
            <span className={`difficulty difficulty-${problem.difficulty}`}>
              {DIFFICULTY_LABELS[problem.difficulty]}
            </span>
          </li>;
        })}
      </ul>
    )}
  </div>;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return <Select value={value} onValueChange={onChange}>
    <SelectTrigger aria-label={label} className="control-select"><SelectValue /></SelectTrigger>
    <SelectContent>
      {options.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
    </SelectContent>
  </Select>;
}
