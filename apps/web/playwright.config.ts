import path from "path";

import { defineConfig, devices } from "@playwright/test";

function monorepoRoot(): string {
  const cwd = process.cwd().replace(/\\/g, "/");
  if (cwd.endsWith("/apps/web")) {
    return path.resolve(process.cwd(), "..", "..");
  }
  return process.cwd();
}

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:3005",
    ...devices["Desktop Chrome"],
  },
  projects: [
    {
      name: "ci",
      testMatch: "**/*.spec.ts",
    },
  ],
  webServer: {
    command: "pnpm --filter @dashboardy/web dev",
    cwd: monorepoRoot(),
    url: "http://localhost:3005",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      PORT: "3005",
      API_PUBLIC_URL: process.env.API_PUBLIC_URL ?? "http://127.0.0.1:4010",
      NEXT_PUBLIC_API_PUBLIC_URL:
        process.env.NEXT_PUBLIC_API_PUBLIC_URL ?? "http://127.0.0.1:4010",
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.example",
    },
  },
});

