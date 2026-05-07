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
    command: `node_modules\\.bin\\next.CMD dev --port ${TEST_PORT}`,
    url: `http://localhost:${TEST_PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    cwd: "../",
    env: {
      DATABASE_URL: "postgresql://platform:platform@localhost:5433/platform_test",
      APP_URL: `http://localhost:${TEST_PORT}`,
      NODE_ENV: "test",
      ADMIN_EMAIL: "admin@example.com",
      NEXT_PUBLIC_APP_URL: `http://localhost:${TEST_PORT}`,
      E2E_BYPASS_VOTING_MIN_DAYS: "true",
      GOVERNANCE_BRAIN_URL: "http://localhost:9999",
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
