import { execSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// The embedding job route needs the local stack's secret key. Read it once
// (workers inherit process.env) and never print it.
function localSecretKey(): string {
  try {
    const out = execSync("npx supabase status -o env", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return /^SECRET_KEY="?([^"\r\n]+)"?\r?$/m.exec(out)?.[1] ?? "";
  } catch {
    return "";
  }
}
process.env.E2E_SUPABASE_SECRET_KEY ??= localSecretKey();
export const E2E_JOB_SECRET = "e2e-embedding-job-secret-0123456789";

// Runs against a production build backed by the local Supabase stack and
// supabase/seed.sql (synthetic data). The NAVER key is blanked so tests never
// call the external map API; real map behavior is checked manually. AI
// search uses the fixture parser and embedder (lib/ai/fixture.ts,
// lib/ai/embeddings.ts).
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
      OPENAI_API_KEY: "",
      EMBEDDING_PROVIDER: "fixture",
      VOYAGE_API_KEY: "",
      SUPABASE_SECRET_KEY: process.env.E2E_SUPABASE_SECRET_KEY ?? "",
      EMBEDDING_JOB_SECRET: E2E_JOB_SECRET,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
