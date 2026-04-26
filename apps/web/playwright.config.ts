import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:3000",
    ...devices["Desktop Chrome"],
  },
  projects: [
    {
      name: "ci",
      testMatch: "**/smoke.spec.ts",
    },
  ],
  webServer: {
    command: "pnpm --dir ../.. --filter @dashboardy/web dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    env: {
      ...process.env,
      API_PUBLIC_URL: process.env.API_PUBLIC_URL ?? "http://localhost:8000",
    },
  },
});

