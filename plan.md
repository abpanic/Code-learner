# Code-learner — content plan

The application is built. What it lacks is **content**: 64 of 70 topics have no lesson at
all, and the six that do are single pages trying to cover a whole topic at once.

This plan replaces the build plan. It covers one thing: getting short, readable, code-backed
lessons onto every topic, by splitting topics into **sub-topics** that each earn their own
page.

Audience: whoever writes the lessons — you, or anyone you bring in.

Status: **C0 complete.** `lin_reg` is the worked example of the model; C1 is next.

---

## 1. The problem with what exists

| | |
|---|---|
| Topics | 70 across 12 domains |
| Topics with a lesson | **6** (all Core ML) |
| Topics with a notebook | 7 |
| Topics with practice problems | 3 |
| Typical lesson size | ~750 words, 5 sections |
| `lin_reg` | ~850 words, 8 sections |

The six existing lessons are decent prose, but each is a single page covering an entire
topic. `lin_reg` is the clearest case: one page carries OLS, ridge, lasso, elastic net,
assumptions, diagnostics and a workflow. That is four or five distinct ideas competing for
one reader's attention, and the reader finishes none of them.

**A long lesson is not a thorough lesson. It is an abandoned one.**

---

## 2. The shape we want

```
Topic                       short overview page — a map, not a lesson
└── Sub-topic               one idea, one page, one sitting
    ├── explanation         3-5 short sections
    ├── worked example      concrete numbers, not notation alone
    ├── check understanding 2-3 questions with answers
    ├── practice            the problems that exercise this idea
    └── go deeper           theory / explanation / learn-more links
```

The topic page stops being a lesson and becomes a **map**: what this area is, why it
matters, and the ordered list of sub-topics with an estimate for each. The lessons live one
level down.

### Worked example: Linear Regression

One page today becomes one map plus four lessons:

| Sub-topic | Covers | Est. |
|---|---|---|
| `ols-fit` | The least-squares idea, the closed form, the small worked fit | 5 min |
| `ridge-lasso-elastic-net` | The three penalties, what each does to coefficients, choosing λ | 6 min |
| `polynomial-and-interactions` | Feature transforms, why that is still a linear model, overfitting | 5 min |
| `assumptions-and-diagnostics` | What each assumption buys, residual plots, collinearity, what breaks | 6 min |

The topic page keeps the framing — when to reach for linear regression at all, and how the
four pieces fit together — in about 300 words.

### Proposed splits for the other five Core ML topics

Starting points, not commitments; the author adjusts while drafting.

| Topic | Sub-topics |
|---|---|
| `log_reg` | `sigmoid-and-odds`, `bce-and-the-gradient`, `thresholds-and-costs`, `multiclass` |
| `trees_rf` | `how-a-tree-splits`, `overfitting-and-pruning`, `bagging-and-random-forests`, `feature-importance` |
| `gbms` | `why-boosting-works`, `gradient-boosting-step-by-step`, `xgboost-lightgbm-catboost`, `tuning-and-regularisation` |
| `dl_fnn` | `neurons-and-layers`, `backpropagation`, `activations-and-initialisation`, `the-training-loop` |
| `transformers` | `attention`, `multi-head-and-position`, `the-block`, `cost-and-context-length` |

---

## 3. The size rule, and how it is enforced

Guidance nobody checks is guidance nobody follows, so the size rule is **validated at build
time**, the same way problem data already is: a violation fails `pnpm build` and names the
offending lesson.

**Budget per sub-topic page**

| Measure | Target | Hard limit (build fails) |
|---|---|---|
| Body words | 400–700 | **900** |
| Sections | 3–5 | **6** |
| Questions | 2–3 | 4 |
| Reading estimate | 4–6 min | 8 min |

**Budget per topic map**: 150–400 words, hard limit 500. It is a map, not a summary.

**Split triggers** — any one of these means the draft is two lessons:

1. It runs past 900 words.
2. It needs a sixth section.
3. It covers more than one method family (ridge *and* polynomial features).
4. The worked example needs a second, unrelated worked example.
5. You cannot write the one-line summary without using "and".

**Merge trigger**: a sub-topic under 250 words is not a lesson. Fold it into its neighbour.

---

## 4. Data model

Extends what exists rather than replacing it. `data/topics.json` stays the spine; lesson
content moves into `data/lessons/<topic-id>.ts`.

```ts
export type LessonSection = {
  id: string;            // anchor, kebab-case
  heading: string;
  body: string;          // markdown; math via $…$ and $$…$$
  callout?: { title: string; body: string };
};

export type Subtopic = {
  id: string;            // unique within the topic, kebab-case
  title: string;
  summary: string;       // one line for the topic map — no "and"
  minutes: number;       // 3-8, checked against the word count
  sections: LessonSection[];                           // 3-6
  questions: { question: string; answer: string }[];   // 2-4
  links: { theory: string; explanation: string; learnMore: string };  // <placeholder>
  problemSlugs?: string[];   // practice for this idea specifically
  notebookId?: string;       // when a notebook belongs to this sub-topic
};

export type TopicLesson = {
  topicId: string;       // must exist in data/topics.json
  overview: string;      // markdown, 150-500 words
  subtopics: Subtopic[]; // 2-6; needing only one means it should not be split
};
```

**Validation** lives in `data/lessons/index.ts` and runs at module load, exactly like
`data/problems/index.ts` does today:

- `topicId` exists; sub-topic ids unique within the topic and kebab-case
- word counts and section counts inside the limits in §3
- every `links` slot present (`<placeholder>` is fine, empty is not)
- `problemSlugs` resolve to real problems, and those problems list this topic
- `minutes` within ±2 of `words / 180`
- no raw URL in a section body — links belong in the link slots

---

## 5. Routes

| Route | Now | Becomes |
|---|---|---|
| `/topics` | index of 70 | unchanged, plus a "3/4 lessons" marker per topic |
| `/topics/[id]` | dynamic page for the 64 without lessons; 6 bespoke folders | **one** dynamic page for all 70: the topic map |
| `/topics/[id]/[subtopic]` | — | **new**: the lesson page |

The six hand-written lesson folders (`app/topics/lin_reg/`, `log_reg/`, …) are **deleted**
once their content moves into `data/lessons/`. Their URLs stay valid because
`/topics/lin_reg` remains a route — it just renders the map instead of a wall of text.

`app/topics/lesson-shell.tsx` is reused for the sub-topic page, with prev/next walking the
sub-topic order and then continuing into the next topic.

---

## 6. What every lesson must contain

A page is not done until all six are true:

1. **One idea.** The title needs no "and".
2. **A worked example with real numbers.** Not just the formula — the arithmetic, small
   enough to follow by hand.
3. **2-3 checks** with answers that explain rather than assert.
4. **At least one linked problem**, or an explicit note that practice is still to come.
5. **Three link slots**, `<placeholder>` until real URLs are chosen.
6. **An honest caveat.** What this method does *not* tell you. The existing lessons do this
   well — "a coefficient is not automatically a causal effect" — and it is the main thing
   separating them from generated filler. Keep it.

**House style**: second person, present tense. Define a term the first time it appears.
Prefer a concrete number to a general claim. No throat-clearing openings ("In this lesson we
will…"). Hedge only where the hedge is real.

---

## 7. Phases

### Phase C0 — Model, routes, validation ✅ done

1. `data/lessons/types.ts` and a validating `index.ts` per §4.
2. `/topics/[id]/[subtopic]` route on the existing lesson shell.
3. Rewrite `/topics/[id]` as the topic map: overview, sub-topic list with estimates and
   read state, attached problems, notebook, evidence control.
4. `lib/lessons.ts` — a per-viewer "read" store alongside `lib/progress.ts` and
   `lib/attempts.ts`. **The 7-level evidence ladder stays at topic level**; sub-topics only
   track read/unread. Evidence is about what you can demonstrate, and that does not
   subdivide usefully.
5. Unit tests for the validators; an e2e test for map → lesson → next lesson.

**Verified.** `lin_reg` was migrated as the proof rather than a throwaway fixture: one
850-word page covering five ideas is now a 235-word map plus four lessons of 337–456 words.
Padding one past the limit fails `pnpm build` with exit 1 and
`lin_reg/ols-fit: 975 words exceeds the 900-word limit — split it`.

Three rules changed while writing that first lesson, each because validation rejected its own
author: the overview minimum caught a 119-word map, the "and" rule caught three lazy
summaries, and the minute estimate had to start charging for display maths, which is reading
load without being words. The word *limit* still ignores maths on purpose — counting it would
push authors to write less explanation around their formulas.

### Phase C1 — Migrate the remaining five Core ML topics (3–4 days) ⟵ **start here**

`lin_reg` is done. Split the other five into ~20 sub-topics per §2, moving the prose across
rather than rewriting it, then filling the gaps the split exposes. Delete their bespoke route
folders and `data/core-lessons.ts` with them; `app/topics/core-lesson.tsx` goes too.

**Done when** all six render as maps, all ~24 sub-topic pages pass validation, and no topic
route is hand-written any more.

This phase also settles whether the model is right. Adjust §3 and §4 here if it is not —
cheaply, before 200 pages depend on them.

### Phases C2–C7 — Write the content

Ordered by what makes the site useful soonest, not by domain size.

| Phase | Domains | Topics | Est. sub-topics |
|---|---|---|---|
| C2 | DS & Algo, SWE / Math | 6 | ~20 |
| C3 | GenAI, GPU / Training | 7 | ~24 |
| C4 | Statistics | 8 | ~26 |
| C5 | MLOps, Systems | 11 | ~34 |
| C6 | Reliability, Data Arch | 16 | ~48 |
| C7 | Security, Leadership | 16 | ~44 |

**~200 sub-topic pages in total**, plus 70 topic maps. That is the real size of the work and
this plan will not pretend otherwise. At four lessons a week it is about a year; at four a
day it is two months. Pick a pace and let the phases take as long as they take.

Each phase ends with: every topic in those domains has a map and at least two sub-topics,
every sub-topic passes validation, and at least one problem exists per topic.

---

## 8. Authoring one lesson

1. Write the one-line `summary` first. If it needs "and", you have two lessons.
2. Draft the sections. Stop at five.
3. Add the worked example with real arithmetic.
4. Write the checks from what a reader would get wrong, not from what you just wrote.
5. Add the caveat.
6. Run `pnpm build` — validation catches an over-long draft immediately.
7. Attach or write a problem; a lesson with no practice is half a lesson.

---

## 9. Tracking

The number that matters is **sub-topics published**, not topics touched. A topic with a map
and no lessons has moved nobody forward.

Secondary: topics with ≥1 problem (3/70 today), topics with a notebook (7/70), and link
slots still holding `<placeholder>`.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Splitting produces stubs instead of lessons | The 250-word merge trigger, and the "at least two sub-topics" bar per topic |
| ~200 pages never gets finished | Phases ordered by usefulness, so stopping after C3 still leaves a coherent site |
| Lessons drift long again | The limits are build-enforced, not advisory |
| Quality drops as volume rises | §6 is a checklist, not a preamble; the caveat requirement is the hardest to fake |
| Sub-topic splits churn after content exists | C1 migrates real content before the model is locked |

---

## 11. Open decisions

| # | Decision | Default | Settle by |
|---|---|---|---|
| E1 | Evidence ladder granularity | Topic level; sub-topics track read/unread only | C0 |
| E2 | Notebooks | Attach to a sub-topic, not the topic | C0 |
| E3 | Keep the 6 bespoke lesson routes? | No — deleted, URLs preserved by the map | C1 |
| E4 | Lesson ordering | Author-defined `subtopics` array order | C0 |
| E5 | When `<placeholder>` links get filled | A later pass, once content is stable | after C3 |

---

## Appendix — what the build already provides

Kept for context; none of it needs further work.

- **Stack**: Next.js 16 App Router on Vercel. `pnpm dev` / `build` / `start`.
- **Practice**: 10 problems in Python and JavaScript, run in-browser via Pyodide in a Web
  Worker, with per-case results and a 10s watchdog.
- **Pages**: dashboard at `/`, competency matrix at `/matrix`, `/problems`, `/topics`,
  `/review` (spaced repetition), `/settings` (theme, backup, reset).
- **Storage**: browser-local — `lib/progress.ts` (evidence), `lib/attempts.ts` (code),
  `lib/backup.ts` (export/import).
- **Themes**: light and dark on a ~30 token palette, both verified against WCAG AA.
- **Tests**: 109 unit, 30 e2e, run in CI on every push and pull request.
- **Optional, never started**: accounts and Postgres, so progress survives a browser change.
  Worth doing only if that becomes a real need.
