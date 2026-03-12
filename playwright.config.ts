import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 1,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],

  // Serve the project root so test-form.html is reachable at /test-form.html
  webServer: {
    command: "python3 -m http.server 4321",
    url: "http://localhost:4321",
    reuseExistingServer: true,
    timeout: 15_000,
  },

  // Single project — the spec file handles both Chrome and Firefox internally
  // via launchPersistentContext, bypassing Playwright's normal browser fixture.
  projects: [
    {
      name: "extension-tests",
      use: {},
    },
  ],
});
