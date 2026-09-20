# Code-learner — build plan

A LeetCode-style practice site with a personal learner dashboard, deployed on Vercel.
Each item is **code-first**: the deliverable per item is a runnable coding exercise with
tests. Theory, explanation and "learn more" are **links only**, and every one of them ships
as the literal token `<placeholder>` until real URLs are chosen.

Audience: whoever picks up this repo next (you, or a collaborator).
Status: **Phases 0, 1 and 2 complete.** Phase 3 (dashboard + IA) is next.

---

## 1. Product in one paragraph

The existing app is a 70-topic AI/ML competency matrix with browser-local progress and an
evidence ladder (To Do → Learned → Implemented → Production Applied → Designed/Owned →
Taught/Led). This plan keeps that curriculum as the **spine** and hangs **coding problems**
off it. A learner picks a topic, solves its problems in an in-browser editor against real
test cases, and the dashboard tracks two independent axes: *code* (problems passed) and
*evidence* (the existing self-reported ladder). Theory lives elsewhere — we only link to it.

---

## 2. Open decisions

These have sensible defaults baked into the plan. Change them here and the phases below
follow; none of them block starting Phase 0.

| # | Decision | Default taken | Why |
|---|---|---|---|
| D1 | Languages supported | **Python first**, JavaScript second | Matches the ML curriculum; Pyodide makes Python viable fully client-side |
| D2 | Where code runs | **In the browser** (Web Worker + Pyodide) | No execution backend, no per-run cost, works on Vercel's free tier, no sandbox-escape surface on our servers |
| D3 | Persistence | **localStorage first**, Postgres in Phase 4 | Ships value immediately; the store is already abstracted behind `lib/progress.ts` |
| D4 | Auth | **None until Phase 4** | Single-learner product until there is a reason for accounts |
| D5 | Theory content | **`<placeholder>` links only** | Explicit requirement; keeps authoring cost per problem low |
| D6 | Existing six ML lessons | **Keep as-is** at `/topics/<id>` | They are written and good; new items do not follow that format |

---

## 3. Where we are now

**Stack today:** stock **Next.js 16** App Router, built with `next build`. Phase 0 removed
the vinext + Vite + Cloudflare Workers layer the project started on.

**Already fixed (this pass):**

- The clean-clone build failure is gone (the missing `.openai/hosting.json` was patched,
  then removed outright with the Cloudflare layer in Phase 0).
- `pnpm lint` passes (was 3 errors).
- Progress store extracted to `lib/progress.ts` — one evidence ladder, one storage key,
  `useSyncExternalStore` instead of `setState`-in-effect, cross-tab sync for free.
- `LessonShell` extracted; `lin_reg` no longer duplicates the lesson chrome and finally has
  its next-lesson link and further-reading block.
- Dead Cloudflare scaffolding removed (`app/chatgpt-auth.ts`, `db/`, `drizzle/`,
  `drizzle.config.ts`, `drizzle-orm`, `drizzle-kit`).

> Drizzle was removed as *dead D1 scaffolding*. Phase 4 reintroduces it deliberately
> against Neon Postgres — that is a different dependency set, not a reversal.

**Still open from the review:** there are no tests and no CI; the site is light-mode only;
`topics.json` carries an unused `status` field.

---

## 4. Target architecture

```
Next.js 16 (App Router) ── Vercel
├── Static/ISR pages          problem list, problem pages, topic pages, marketing
├── Client islands            editor, runner, dashboard charts
├── Web Worker                Pyodide (Python) / sandboxed eval (JS)  ← all execution
└── Storage
    ├── Phase 1–3  localStorage via lib/progress.ts + lib/attempts.ts
    └── Phase 4+   Neon Postgres + Drizzle, via Route Handlers
```

**Why the browser, not a server runner:** Vercel functions cap out at short wall-clock
limits, sandboxing untrusted code server-side is a real security project, and a hosted
judge (Judge0/Piston) adds an account, a bill and a network hop per run. Pyodide costs a
~6 MB one-time download and then runs offline, instantly, forever.

---

## 5. Pages plan

Routes marked **new** do not exist yet. `(…)` denotes a route group, `[…]` a dynamic segment.

| Route | Type | Purpose | Key components | Data source | Phase |
|---|---|---|---|---|---|
| `/` | **replace** | Learner dashboard — the home screen | `StreakCard`, `SolvedByDifficulty`, `TopicHeatmap`, `ReviewQueue`, `ContinueWhereYouLeftOff` | attempts + progress store | 3 |
| `/problems` | done | Sortable, filterable problem list (the LeetCode table) | `ProblemTable`, `ProblemFilters`, `StatusPill` | `data/problems/*` | 1 |
| `/problems/[slug]` | done | The workspace — *this is the product* | `ProblemPane`, `CodeEditor`, `RunBar`, `TestResults`, `PlaceholderLinks` | `data/problems/<slug>` | 1–2 |
| `/topics` | **new** | Curriculum view — the 70 topics, each with its problem count | `TopicGrid`, `DomainSection`, `EvidenceSelect` | `data/topics.json` | 3 |
| `/topics/[id]` | **keep + extend** | Existing six ML lessons; all 70 get a problems list + `<placeholder>` theory links | `LessonShell`, `ProblemsForTopic`, `PlaceholderLinks` | `core-lessons.ts`, problems | 3 |
| `/matrix` | **move** | Today's tracker UI, relocated off `/` | existing `Tracker` | progress store | 3 |
| `/review` | **new** | Spaced-repetition queue: problems due for a re-solve | `ReviewQueue`, `DueCard` | attempts store | 5 |
| `/settings` | **new** | Import/export progress, reset, editor prefs, theme | `ProgressIO`, `ThemeToggle` | progress store | 5 |
| `/api/run` | *not built* | Deliberately absent — execution stays client-side (D2) | — | — | — |

**Route moves in Phase 3:** `/` becomes the dashboard and today's tracker moves to
`/matrix`. Add a redirect for `/?topic=<id>` → `/topics/<id>` so existing deep links survive.

### `/problems/[slug]` layout

The one screen that matters. Desktop is a two-pane split; below 900px it stacks with the
editor first, because the code is the point.

```
┌──────────────────────────────┬───────────────────────────────┐
│ Title · Difficulty · Topic   │  [Python ▾]      [Reset] [Run]│
│                              ├───────────────────────────────┤
│ Prompt (short, 3–6 lines)    │                               │
│                              │      CodeMirror 6             │
│ Signature / constraints      │      (starter code)           │
│                              │                               │
│ Theory      → <placeholder>  ├───────────────────────────────┤
│ Explanation → <placeholder>  │  Tests      3/5 passed        │
│ Learn more  → <placeholder>  │  ✓ empty input                │
│                              │  ✗ duplicates → got [1,1]     │
│ Evidence level  [ ▾ ]        │      expected [1]             │
└──────────────────────────────┴───────────────────────────────┘
```

Rules for this page:

- The prompt is **short**. No derivations, no worked examples — those are `<placeholder>` links.
- Every problem renders all three placeholder links, even when unresolved, so the slot is
  visible and fillable later.
- The evidence-level control is the *existing* ladder, bound to the problem's topic. Passing
  tests and claiming evidence stay separate signals.

---

## 6. Data model

### Problem (`data/problems/<slug>.ts`)

```ts
export type Problem = {
  slug: string;                    // url + storage key, stable forever
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topicIds: string[];              // FK into data/topics.json
  tags: string[];                  // "two-pointers", "gradient-descent", …
  prompt: string;                  // ≤ 6 lines of markdown, no theory
  links: {                         // always present; "<placeholder>" until filled
    theory: string;
    explanation: string;
    learnMore: string;
  };
  languages: {
    python?: { starter: string; solution: string; entry: string };
    javascript?: { starter: string; solution: string; entry: string };
  };
  tests: TestCase[];
  hints: string[];                 // ["<placeholder>"]
};

export type TestCase = {
  name: string;
  args: unknown[];
  expected: unknown;
  hidden?: boolean;                // runs on submit, not on run
};
```

`entry` is the function name the harness calls. Keeping tests as data (not test code) means
one harness serves every language.

### Attempt (localStorage, Phase 1–3)

```ts
type Attempt = {
  slug: string;
  language: "python" | "javascript";
  code: string;                    // last editor buffer, restored on return
  status: "unsolved" | "attempted" | "solved";
  passed: number; total: number;
  runs: number;
  firstSolvedAt?: string;          // ISO
  lastRunAt: string;
  msElapsed?: number;
  nextReviewAt?: string;           // SM-2 lite
};
```

Key: `code_learner_attempts_v1`. Kept **separate** from `ml_transition_skills` so the
existing evidence data is never at risk from a schema change on the code side.

### Storage modules

- `lib/progress.ts` — exists. Evidence ladder. Do not widen it.
- `lib/attempts.ts` — **new**, same `useSyncExternalStore` shape, versioned key, migration-safe.
- `lib/stats.ts` — **new**, pure functions: streak, per-topic rollups, review queue. Pure so
  they are unit-testable without a DOM.

---

## 7. Code runner design

`lib/runner/` — a worker, a protocol, and a harness per language.

**Protocol** (`postMessage`, both directions):

```ts
type RunRequest  = { id: string; language: Language; code: string; tests: TestCase[]; entry: string };
type RunResponse =
  | { id: string; type: "ready" }
  | { id: string; type: "result"; results: TestResult[]; stdout: string; ms: number }
  | { id: string; type: "error"; message: string; line?: number };
```

**Python:** load Pyodide from the jsDelivr CDN inside the worker, `pyodide.runPython` the
learner's code into a namespace, then call `entry` per test case and compare against
`expected`. `numpy`, `pandas` and `scikit-learn` ship in the Pyodide distribution — load
them lazily and only for problems that declare them, since each adds seconds to first run.

**JavaScript:** same worker, no Pyodide. `new Function` inside the worker scope; the worker
has no DOM and no cookies, so the blast radius is a terminated worker.

**Non-negotiables:**

1. **Timeout.** A watchdog in the main thread terminates the worker at 10s and reports
   "timed out" — a `while True:` must not wedge the tab.
2. **Warm start.** Keep one worker alive across runs; Pyodide init is the slow part. Only
   terminate on timeout or language switch.
3. **Deterministic diffs.** Show `got` vs `expected` with a stable serializer, floats
   compared to a tolerance for the ML problems.
4. **Never trust the buffer.** Restore the editor from `attempts`, but always run what is
   on screen.

**First-load budget:** Pyodide is ~6 MB compressed. Load it on first *Run*, not on page
load, behind an explicit "Preparing Python…" state with a progress indicator.

---

## 8. Dashboard design

Two axes, never conflated:

- **Code** — problems solved, by difficulty and by topic. Objective; comes from test runs.
- **Evidence** — the seven-level ladder. Self-reported; comes from `lib/progress.ts`.

Cards, in priority order:

1. **Continue** — the last attempted-but-unsolved problem, one click away.
2. **Streak** — consecutive days with ≥1 run. Generous: a run counts, not just a solve.
3. **Solved by difficulty** — three counters + a bar.
4. **Topic coverage** — the 12 domains, each showing `solved/total` problems *and* evidence
   depth. Reuse the existing `evidenceScore/5` maths so the two views agree.
5. **Review due** — count + link to `/review`.
6. **Recent activity** — last 10 runs, pass/fail, with a link back.

Charts: Recharts is already a dependency. Load the `dataviz` skill before writing any chart
code so the palette and stat tiles are consistent.

---

## 9. Phases

Each phase ends in something deployable. Do not start the next until the acceptance
criteria hold.

### Phase 0 — Vercel migration ✅ done

Landed in `0bbef61`. 21 files changed, 3417 deletions against 140 insertions — the phase
deleted far more than it added, as expected.

1. `git add -A && git commit` the current tree — **do this first**; only `LICENSE` is
   committed today, so every fix above is one `rm` from gone.
2. Delete the Cloudflare/Sites layer: `vite.config.ts`, `build/sites-vite-plugin.*`,
   `scripts/run-framework.mjs`, `scripts/sites-env.*`, `scripts/execution-profile.mjs`,
   `scripts/install-*`, `scripts/build-verified.sh`, `.openai/`, `cloudflare-env.d.ts`,
   `pnpm-workspace.yaml` (if unused), `vendor/` stays.
3. Drop deps: `vinext`, `wrangler`, `@cloudflare/vite-plugin`, `@cloudflare/workers-types`,
   `@vitejs/plugin-react`, `@vitejs/plugin-rsc`, `vite`, `react-server-dom-webpack`.
4. Rewrite scripts:
   ```json
   "dev":   "node scripts/build-notebook-manifest.mjs && next dev",
   "build": "node scripts/build-notebook-manifest.mjs && next build",
   "start": "next start",
   "lint":  "eslint ."
   ```
5. `next.config.ts`: remove `output: "export"` — Phase 4 wants Route Handlers.
6. `tsconfig.json`: drop `@cloudflare/workers-types` from `types`.
7. Import the repo in Vercel. Framework preset: Next.js. Build command inherits from
   `package.json`. Node 22. No env vars needed yet.

**Verified:** `pnpm lint`, `pnpm typecheck` and `pnpm build` are clean; `next start` serves
all 7 routes plus `/notebooks/*.ipynb`. Remaining: import the repo in Vercel (step 7) — that
needs your account.

### Phase 1 — Problem infrastructure ✅ done

1. `data/problems/` + the `Problem` type + a `scripts/build-problem-manifest.mjs` that
   validates every problem (unique slug, known `topicIds`, ≥3 tests, all three `links` keys
   present) and emits `data/problems.json`. Mirror `build-notebook-manifest.mjs` — it
   already fails the build on bad data, which is exactly the behaviour wanted here.
2. Author **10 seed problems** across 3 topics (`lin_reg`, `dsa_arrays`, `log_reg`), every
   theory link `<placeholder>`.
3. `/problems` list: title, difficulty, topics, status pill, filters (topic, difficulty,
   status, text), URL-synced filter state.
4. `lib/attempts.ts` + `lib/stats.ts` with unit tests.

**Verified:** 10 problems across 3 topics; `/problems` filters by topic, difficulty, status
and text with state mirrored to the URL; breaking a `topicId` fails `pnpm build` with exit 1
and a message naming the problem and field; 78 Vitest tests pass.

Two changes from the plan as written. Validation lives in `data/problems/index.ts` and runs
at module load rather than in a separate `build-problem-manifest.mjs` — a `.mjs` script
cannot read the `.ts` problem files without extra tooling, and import-time validation fails
the build just as hard. The DSA topic id is `dsa_arrays_ptrs`, not `dsa_arrays`.

### Phase 2 — The workspace ✅ done

1. CodeMirror 6 + Python/JS modes, tab-size and bracket config, `Cmd/Ctrl+Enter` = Run.
2. `lib/runner/` per Section 7: worker, protocol, Python harness, JS harness, watchdog.
3. `/problems/[slug]` two-pane layout, `TestResults` with per-case diffs, buffer restore.
4. `PlaceholderLinks` — renders the three link slots; a `<placeholder>` value renders as a
   disabled chip with a tooltip, never a dead `<a href>`.
5. Wire a pass to `attempts.status = "solved"`.

**Verified** by two Playwright smoke tests against a real browser: cold open, starter fails
0/4, pasted solution passes 4/4, Submit runs the hidden case for 5/5, reload restores the
buffer, and the list shows Solved. A second test confirms `while True:` is stopped at 10s
rather than wedging the tab. 109 unit tests, including the Python harness driven against
real CPython-in-WASM.

One change from the plan: `/api/run` stays absent as intended, and the worker deliberately
does no grading — it reports raw return values and `lib/runner/compare.ts` decides. That is
what lets the live runner and the build-time solution tests share one rule set.

### Phase 3 — Dashboard and IA (est. 2–3 days) ⟵ **start here**

1. Move `Tracker` to `/matrix`; build the dashboard at `/`; add the `/?topic=` redirect.
2. Cards per Section 8.
3. `/topics` and `/topics/[id]` extended with per-topic problem lists.

**Done when:** `/` answers "what should I do next?" in one screen, and every number on it
traces to either `attempts` or `progress`.

### Phase 4 — Accounts and durable storage (est. 3–4 days, optional)

Only if progress must survive a browser change. Neon Postgres + Drizzle + Auth.js, Route
Handlers at `/api/attempts` and `/api/progress`, localStorage becomes an offline cache that
syncs on load. Migration path: on first sign-in, offer to upload the local store.

### Phase 5 — Polish (ongoing)

Dark mode (define the dark palette against the existing `:root` tokens — there is no
`prefers-color-scheme` block anywhere today), `/review` with SM-2 lite, `/settings`,
keyboard shortcuts, a11y pass, `status` field dropped from `topics.json`.

---

## 10. Testing and CI

Nothing exists today. Minimum worth having:

- **Vitest** for `lib/` — `stats.ts`, `attempts.ts`, `progress.ts` are pure and cheap to test.
- **Runner contract tests** — for each seed problem, the reference `solution` must pass
  100% of its own tests. This catches broken test data at build time and is the single
  highest-value test in the project.
- **Playwright smoke** — done in Phase 2 (`pnpm e2e`); uses the locally installed Chrome.
- **GitHub Actions** on push/PR: `pnpm install --frozen-lockfile && pnpm lint && npx tsc
  --noEmit && pnpm test && pnpm build`. The two blocking bugs found in review would both
  have been caught by this.

---

## 11. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Pyodide first-load feels slow | Learner bounces before the first run | Load on Run not on mount; explicit progress UI; warm worker afterwards |
| `numpy`/`sklearn` per-problem load cost | Multi-second stalls on ML problems | Declare packages per problem; preload while they read the prompt |
| Authoring problems is the real bottleneck | Site looks empty (the existing app already shows this: 7 notebooks for 70 topics) | Treat problem count as the project's actual KPI; 10 good problems beat 70 stubs |
| localStorage loss | Progress gone | Export/import already exists — surface it in `/settings` and prompt after the 10th solve |
| Scope drift back into theory content | Dilutes the code-first premise | `<placeholder>` stays until a phase explicitly says otherwise |

---

## 12. Immediate next actions

1. Merge `phase-0-vercel-migration` and import the repo in Vercel (Next.js preset, Node 22,
   no env vars) to get a preview URL for what already exists.
2. Author two problems by hand before building the list page — the data shape in Section 6
   is a guess until real content pushes back on it.
3. Decide D1–D6 in Section 2, or accept the defaults by leaving them.
