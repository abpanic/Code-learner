import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 3 acceptance: the dashboard answers "what next?" in one screen, and
 * every number on it traces back to the attempt store or the progress store.
 */

const ATTEMPTS_KEY = "code_learner_attempts_v1";
const PROGRESS_KEY = "ml_transition_skills";

/** Seeds both stores before any script on the page runs. */
async function seed(page: Page) {
  const now = new Date().toISOString();
  const attempts = {
    "two-sum-indices": {
      slug: "two-sum-indices", language: "python", code: "# solved",
      status: "solved", passed: 5, total: 5, runs: 3,
      firstSolvedAt: now, lastRunAt: now,
      // Due in the past, so it lands in the review queue.
      nextReviewAt: "2020-01-01T00:00:00.000Z",
    },
    "move-zeroes": {
      slug: "move-zeroes", language: "python", code: "# halfway",
      status: "attempted", passed: 2, total: 4, runs: 1, lastRunAt: now,
    },
  };
  await page.addInitScript(
    ([aKey, aVal, pKey, pVal]) => {
      localStorage.setItem(aKey as string, aVal as string);
      localStorage.setItem(pKey as string, pVal as string);
    },
    [ATTEMPTS_KEY, JSON.stringify(attempts), PROGRESS_KEY, JSON.stringify({ lin_reg: "implemented", log_reg: "learned" })] as const,
  );
}

test("surfaces the unsolved problem to continue", async ({ page }) => {
  await seed(page);
  await page.goto("/");

  const cont = page.locator(".dash-continue");
  await expect(cont).toContainText("Pick up where you left off");
  await expect(cont).toContainText("Move zeroes to the end");
  await expect(cont).toContainText("2/4 passing");
  await cont.click();
  await expect(page).toHaveURL(/\/problems\/move-zeroes$/);
});

test("every tile traces to the seeded stores", async ({ page }) => {
  await seed(page);
  await page.goto("/");

  const tiles = page.locator(".dash-tile");
  await expect(tiles.filter({ hasText: "Streak" })).toContainText("1");
  await expect(tiles.filter({ hasText: "Problems solved" })).toContainText("1");
  // Two topics carry a level above To Do.
  await expect(tiles.filter({ hasText: "Topics with evidence" })).toContainText("2");
  await expect(tiles.filter({ hasText: "Due for review" })).toContainText("1");

  // Recent activity lists both attempts, newest first.
  const activity = page.locator(".dash-activity li");
  await expect(activity).toHaveCount(2);

  // The solved easy problem shows against the easy total.
  await expect(page.locator(".dash-bar").filter({ hasText: "Easy" })).toContainText("1 /");
});

test("shows an empty state before anything is attempted", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".dash-continue-empty")).toContainText("Start a problem");
  await expect(page.locator(".dash-empty")).toContainText("No runs yet");
});

test("keeps legacy /?topic= links working", async ({ page }) => {
  await page.goto("/?topic=exp_design");
  await expect(page).toHaveURL(/\/matrix\?topic=exp_design$/);
  // The matrix opens that topic's detail dialog.
  await expect(page.getByRole("dialog")).toContainText("Experiment Design", { timeout: 15_000 });
});

test("topics index links through to a topic without a lesson", async ({ page }) => {
  await page.goto("/topics");
  await expect(page.getByRole("heading", { name: "Topics", exact: true })).toBeVisible();

  await page.goto("/topics/vector_dbs");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".link-slot-empty")).toHaveCount(3);
  await expect(page.locator(".topic-section", { hasText: "Practice problems" })).toBeVisible();
});

test("a topic with problems lists them", async ({ page }) => {
  await page.goto("/topics/dsa_arrays_ptrs");
  const list = page.locator("#problems .problem-row");
  await expect(list).toHaveCount(4);
  await expect(list.first()).toContainText("Two Sum");
});
