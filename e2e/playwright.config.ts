import { defineConfig, devices } from "@playwright/test";

const TEST_PORT = 3008;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "report" }]],

  globalSetup: "./global-setup.ts",

  use: {
    baseURL: `http://localhost:${TEST_PORT}`,
    storageState: ".admin-state.json",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  webServer: {
    command: `next dev --port ${TEST_PORT}`,
    url: `http://localhost:${TEST_PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    cwd: "../",
    env: {
      DATABASE_URL: "file:./e2e/test.db",
      NODE_ENV: "test",
      ADMIN_EMAIL: "admin@example.com",
      NEXT_PUBLIC_APP_URL: `http://localhost:${TEST_PORT}`,
      // No Resend key — magic links print to stdout in test
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
