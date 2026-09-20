# Principal AI/ML Competency Matrix

A Next.js/React port of the original single-file tracker. It contains all 70 topics, eight role profiles, domain and level filters, the six-month starter roadmap, browser-local progress, and Jupyter notebook previews.

All six topics in **Machine Learning & Deep Learning Core** have dedicated lessons. Click a topic title or **Read lesson** to open its page. Each lesson includes explanations, a worked example, practical checks, questions with answers, an evidence-level control, and a downloadable Jupyter notebook:

| Topic | Lesson | Notebook |
| --- | --- | --- |
| Linear Regression & Regularization | `/topics/lin_reg` | `public/notebooks/lin_reg.ipynb` |
| Logistic Regression & BCE Loss | `/topics/log_reg` | `public/notebooks/log_reg.ipynb` |
| Decision Trees & Random Forests | `/topics/trees_rf` | `public/notebooks/trees_rf.ipynb` |
| Gradient Boosting | `/topics/gbms` | `public/notebooks/gbms.ipynb` |
| Feedforward Neural Networks & Backprop | `/topics/dl_fnn` | `public/notebooks/dl_fnn.ipynb` |
| Transformers & Attention Mechanisms | `/topics/transformers` | `public/notebooks/transformers.ipynb` |

## Run and build

Use the repository's pnpm lockfile and Node 22 or newer:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

The site is configured for a static export. Host the generated `dist/client` directory on a static host that serves `index.html` and resolves clean topic URLs such as `/topics/log_reg` to their exported `.html` pages. This project is also configured for Sites hosting. No notebook execution service or backend account is needed to browse it.

## Put the source on GitHub

Create an empty GitHub repository and upload the **contents** of the source ZIP, keeping folders such as `app`, `data`, `public`, and `scripts` at the repository root. The ZIP is source code; it omits generated build output and installed dependencies. Alternatively, from the unzipped folder:

```sh
git init
git add .
git commit -m "Add Principal AI/ML competency site"
git branch -M main
git remote add origin https://github.com/YOUR-USER/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the example remote with your own repository URL. GitHub holds the source; a static hosting service is needed to publish the built site.

## Attach a notebook to a topic

1. Find the topic's ID in `data/topics.json` (for example, `lin_reg` or `exp_design`).
2. Save a valid Jupyter notebook as `public/notebooks/<topic-id>.ipynb`.
3. Rebuild or restart the development server. `scripts/build-notebook-manifest.mjs` validates that each notebook matches a topic and refreshes `data/notebooks.json`.

The notebook appears on its lesson page (or in the topic's Notebook tab for other domains) and as a downloadable `.ipynb`. The preview renders Markdown, math, code, plain-text output, and saved PNG output. It deliberately ignores HTML and JavaScript outputs. The host **does not execute notebook cells**. Run the notebook in a separate Python/Jupyter environment to refresh outputs before publishing it. Seven working notebooks are included: all six Core ML topics and `exp_design.ipynb`.

## Progress and migration

Progress stays in the visitor's browser under the original `ml_transition_skills` key. The app maps legacy `mastered` to `Learned`, retaining `in_progress` as `In Progress (legacy)` until you assign a specific evidence level.

A new hosted domain cannot read the local HTML file's browser storage. Open the updated original HTML in the browser where you tracked progress and choose **Export Progress**. Then choose **Import progress** in this app and select the downloaded JSON. The app also exports its own backup file. Imports merge matching topic IDs with current progress; unknown IDs are ignored.

## Content

- `data/topics.json`: imported topic descriptions, formulas, role priorities, questions, and domain metadata.
- `public/notebooks`: source notebook assets.
- `app/tracker.tsx`: filtering, status updates, local persistence, topic detail, and roadmap.
- `app/notebook-viewer.tsx`: read-only notebook renderer.
