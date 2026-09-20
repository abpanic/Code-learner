import { defineConfig } from "@playwright/test";

/**
 * Smoke tests drive the real workspace: CodeMirror, the worker and Pyodide.
 * They use the locally installed Chrome so CI/dev does not need Playwright's
 * bundled browser download.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3113",
    channel: "chrome",
    headless: true,
  },
});
