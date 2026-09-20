import { expect, test } from "@playwright/test";

/**
 * The Phase 2 acceptance path: open a problem cold, run the starter, see it
 * fail, paste the solution, run again, see it pass, reload and find the code
 * still there.
 */

const PROBLEM = "/problems/two-sum-indices";

const PY_SOLUTION = `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []
`;

/**
 * Replaces the editor contents. A paste event is used rather than typing
 * because CodeMirror auto-indents, which would mangle Python.
 */
const LOOP_FOREVER = `def move_zeroes(nums):
    while True:
        pass
`;

async function setCode(page: import("@playwright/test").Page, code: string) {
  const content = page.locator(".cm-content");
  await content.click();
  await page.keyboard.press("ControlOrMeta+a");
  await content.evaluate((node, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    node.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, code);
  await page.waitForTimeout(100);
}

test("runs the starter, then a working solution, and remembers the code", async ({ page }) => {
  await page.goto(PROBLEM);

  await expect(page.getByRole("heading", { name: "Two Sum — return indices" })).toBeVisible();
  await expect(page.locator(".cm-content")).toContainText("def two_sum");

  // The starter returns None, so every case should fail.
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.locator(".results-head")).toContainText("0 / 4 passed", { timeout: 90_000 });

  await setCode(page, PY_SOLUTION);
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.locator(".results-head")).toContainText("4 / 4 passed");
  await expect(page.locator(".results-solved")).toBeVisible();

  // Submit also runs the hidden case.
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.locator(".results-head")).toContainText("5 / 5 passed");

  // The buffer survives a reload.
  await page.reload();
  await expect(page.locator(".cm-content")).toContainText("seen[n] = i");
  await expect(page.getByText("Picked up where you left off")).toBeVisible();

  // The solve is visible on the list, in the same browser context.
  await page.goto("/problems");
  const row = page.locator(".problem-row", { hasText: "Two Sum" });
  await expect(row.locator(".status-solved")).toBeVisible();
});

test("reports an infinite loop instead of hanging", async ({ page }) => {
  await page.goto("/problems/move-zeroes");
  await setCode(page, LOOP_FOREVER);
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.locator(".results-failed")).toContainText("Stopped after 10s", { timeout: 90_000 });
});
