import { defineConfig } from "@playwright/test";

/**
 * Smoke tests drive the real workspace: CodeMirror, the worker and Pyodide.
 *
 * Locally they use the installed Chrome, so no browser download is needed.
 * CI sets PLAYWRIGHT_CHANNEL to an empty string to fall back to Playwright's
 * own Chromium, which it installs as part of the workflow.
 */

const PORT = Number(process.env.E2E_PORT ?? 3113);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const channel = process.env.PLAYWRIGHT_CHANNEL ?? "chrome";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL,
    headless: true,
    trace: "retain-on-failure",
    ...(channel ? { channel } : {}),
  },
  // Requires a production build. Locally an already-running server is reused.
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
