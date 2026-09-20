# Principal AI/ML Competency Matrix

[![CI](https://github.com/abpanic/Code-learner/actions/workflows/ci.yml/badge.svg)](https://github.com/abpanic/Code-learner/actions/workflows/ci.yml)

A Next.js/React tracker covering 70 topics, eight role profiles, domain and level filters,
a six-month starter roadmap, browser-local progress, and Jupyter notebook previews.

Where this is heading — a LeetCode-style practice site with a learner dashboard — is
described in [plan.md](plan.md).

All six topics in **Machine Learning & Deep Learning Core** have dedicated lessons. Click a
topic title or **Read lesson** to open its page. Each lesson includes explanations, a worked
example, practical checks, questions with answers, an evidence-level control, and a
downloadable Jupyter notebook:

| Topic | Lesson | Notebook |
| --- | --- | --- |
| Linear Regression & Regularization | `/topics/lin_reg` | `public/notebooks/lin_reg.ipynb` |
| Logistic Regression & BCE Loss | `/topics/log_reg` | `public/notebooks/log_reg.ipynb` |
| Decision Trees & Random Forests | `/topics/trees_rf` | `public/notebooks/trees_rf.ipynb` |
| Gradient Boosting | `/topics/gbms` | `public/notebooks/gbms.ipynb` |
| Feedforward Neural Networks & Backprop | `/topics/dl_fnn` | `public/notebooks/dl_fnn.ipynb` |
| Transformers & Attention Mechanisms | `/topics/transformers` | `public/notebooks/transformers.ipynb` |

## Run and build

Node 22 or newer, pnpm 11:

```sh
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
pnpm start      # serve the production build locally
```

| Script | Does |
| --- | --- |
| `pnpm dev` | Rebuilds the notebook manifest, then `next dev` |
| `pnpm build` | Rebuilds the notebook manifest, then `next build` |
| `pnpm start` | `next start` against the built output |
| `pnpm lint` | ESLint over the whole repo |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit tests |
| `pnpm e2e` | Playwright smoke tests (needs `pnpm build` first) |

`pnpm dev` and `pnpm build` both run `scripts/build-notebook-manifest.mjs` first. It
validates that every notebook under `public/notebooks` matches a topic ID and refreshes
`data/notebooks.json`, failing the build if a notebook is malformed or orphaned.

## Tests

```sh
pnpm test    # unit
pnpm build && pnpm e2e    # browser smoke tests
```

`pnpm test` covers the pure modules plus two things worth knowing about:

- Every reference solution is run against its own test table, in both languages, and each
  starter is asserted to fail. That is what catches a wrong `expected` value at author time.
- The Python harness is driven against real CPython-in-WASM. It reads the harness source out
  of `public/runner-worker.js` rather than copying it, so the test fails if the two drift.

`pnpm e2e` drives a real browser: solving a problem end to end, the 10-second watchdog on a
runaway loop, and the dashboard against a seeded store. It uses the locally installed Chrome
by default, so no browser download is needed; set `PLAYWRIGHT_CHANNEL=""` to use Playwright's
own Chromium instead. Playwright starts the production server itself and reuses one that is
already running.

CI runs lint, typecheck, unit tests, build and the e2e suite on every push and pull request.

## Deploying

The app is a standard Next.js App Router project and deploys to Vercel with no
configuration: import the repository, accept the Next.js preset, set Node 22. Every route
currently prerenders as static content, so the deployment is effectively a CDN-served site.
No notebook execution service or backend account is needed.

## Attach a notebook to a topic

1. Find the topic's ID in `data/topics.json` (for example, `lin_reg` or `exp_design`).
2. Save a valid Jupyter notebook as `public/notebooks/<topic-id>.ipynb`.
3. Rebuild or restart the development server.

The notebook appears on its lesson page (or in the topic's Notebook tab for other domains)
and as a downloadable `.ipynb`. The preview renders Markdown, math, code, plain-text output,
and saved PNG output. It deliberately ignores HTML and JavaScript outputs. The host **does
not execute notebook cells** — run the notebook in a separate Python/Jupyter environment to
refresh its outputs before publishing it. Seven notebooks are included: all six Core ML
topics plus `exp_design.ipynb`.

## Progress and migration

Progress stays in the visitor's browser under the original `ml_transition_skills` key,
behind `lib/progress.ts`. The app maps legacy `mastered` to `Learned` and retains
`in_progress` as `In Progress (legacy)` until you assign a specific evidence level.

A new hosted domain cannot read a local HTML file's browser storage. Open the original
tracker in the browser where you recorded progress, choose **Export Progress**, then choose
**Import progress** here and select the downloaded JSON. Imports merge matching topic IDs
with current progress; unknown IDs are ignored. The app also exports its own backup file.

## Layout

- `app/` — App Router pages. `app/tracker.tsx` is the matrix; `app/topics/` holds the lessons.
- `app/topics/lesson-shell.tsx` — chrome shared by every lesson page.
- `data/topics.json` — topic descriptions, formulas, role priorities, questions, domains.
- `data/core-lessons.ts` — lesson content for the five data-driven Core ML lessons.
- `lib/progress.ts` — evidence ladder and the browser-local progress store.
- `public/notebooks/` — source notebook assets.
- `components/ui/` — shadcn components, vendored verbatim.
