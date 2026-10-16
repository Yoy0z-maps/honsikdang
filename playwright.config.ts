import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// Runs against a production build backed by the local Supabase stack and
// supabase/seed.sql (synthetic data). The NAVER key is blanked so tests never
// call the external map API; real map behavior is checked manually. AI
// search uses the fixture parser (lib/ai/fixture.ts).
// Viewports follow master plan §5A QA acceptance: 360×800 and 390×844.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-360",
      use: { ...devices["Pixel 7"], viewport: { width: 360, height: 800 } },
    },
    {
      name: "mobile-390",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_NAVER_MAP_CLIENT_ID: "",
      // Rule-based test fixture instead of the model: no key, no spend.
      AI_PROVIDER: "fixture",
      ANTHROPIC_API_KEY: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
