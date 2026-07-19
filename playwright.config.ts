import { defineConfig, devices } from "@playwright/test";

declare const process: { env: Record<string, string | undefined> };

// Smoke UI suite prefers offline demo mode (no Supabase) so owner CRUD + seed
// ownership stay deterministic without prod credentials.
// Port override avoids collisions when multiple QA workers share the machine.
const smokePort = Number(process.env.PW_SMOKE_PORT || 5191);
const smokeOrigin = `http://127.0.0.1:${smokePort}`;

const demoEnv = {
  ...process.env,
  VITE_SUPABASE_URL: "",
  VITE_SUPABASE_ANON_KEY: "",
};

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  testIgnore: ["**/*.test.mjs", "**/node_modules/**"],
  timeout: 45_000,
  expect: {
    timeout: 12_000,
  },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: smokeOrigin,
    trace: "on-first-retry",
    // Prefer commit-level nav readiness; full "load" can stall under Vite HMR.
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${smokePort}`,
    url: smokeOrigin,
    reuseExistingServer: true,
    timeout: 90_000,
    env: demoEnv,
  },
});
