// Live evaluation of the natural-language parser (decision Q43).
// Calls the real model and spends a little money (~50 short requests):
//   npm run eval:parse
// Needs OPENAI_API_KEY (or ANTHROPIC_API_KEY with AI_PROVIDER=anthropic) in
// .env or .env.local; skipped otherwise. Rate-limited calls (429) are
// retried after a pause, so low-tier accounts take longer but still finish. Results: specs/evals/results/search-parse-latest.json.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { AnthropicQueryParser } = await import("@/lib/ai/anthropic");
const { OpenAIQueryParser } = await import("@/lib/ai/openai");
const { interpretQuery } = await import("@/lib/ai/interpret");
const { PROMPT_VERSION } = await import("@/lib/ai/prompt");
const { THRESHOLDS, percentile, scoreCase } =
  await import("@/lib/ai/eval-score");
type EvalCase = import("@/lib/ai/eval-score").EvalCase;

// Same provider choice as the app (lib/ai/index.ts): OpenAI by default.
const provider = process.env.AI_PROVIDER?.trim() || "openai";
const key = (
  provider === "anthropic"
    ? process.env.ANTHROPIC_API_KEY
    : process.env.OPENAI_API_KEY
)?.trim();
const { cases } = JSON.parse(
  readFileSync("specs/evals/search-parse.cases.json", "utf8"),
) as { cases: EvalCase[] };

// USD per million tokens (verified 2026-10-15/16), for the report only.
const PRICES: Record<string, { input: number; output: number }> = {
  "gpt-6-luna": { input: 0.1, output: 0.5 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

describe.skipIf(!key)("search parse evaluation (live)", () => {
  it(
    "meets the agreed thresholds",
    async () => {
      const parser =
        provider === "anthropic"
          ? new AnthropicQueryParser(key!)
          : new OpenAIQueryParser(key!);
      const PRICE = PRICES[parser.model];
      const rows = [];
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      for (const c of cases) {
        let result = await interpretQuery(parser, c.query);
        for (
          let attempt = 1;
          attempt <= 6 && / 429 rate_limit_exceeded/.test(result.detail ?? "");
          attempt++
        ) {
          await sleep(21_000);
          result = await interpretQuery(parser, c.query);
        }
        const score = scoreCase(c.expect, result.parsed);
        rows.push({ ...c, ...result, ...score });
      }

      const passed = rows.filter((r) => r.pass).length;
      const injections = rows.filter((r) => r.kind === "injection");
      const latencies = rows.map((r) => r.latencyMs);
      const tokens = rows.reduce(
        (sum, r) => ({
          input: sum.input + r.usage.inputTokens,
          output: sum.output + r.usage.outputTokens,
        }),
        { input: 0, output: 0 },
      );
      const summary = {
        date: new Date().toISOString(),
        model: parser.model,
        promptVersion: PROMPT_VERSION,
        cases: rows.length,
        passRate: passed / rows.length,
        injectionPassRate:
          injections.filter((r) => r.pass).length / injections.length,
        fallbacks: rows.filter((r) => r.outcome !== "ok").length,
        p50LatencyMs: percentile(latencies, 50),
        p95LatencyMs: percentile(latencies, 95),
        tokens,
        costUsd:
          (tokens.input * PRICE.input + tokens.output * PRICE.output) / 1e6,
        thresholds: THRESHOLDS,
      };
      mkdirSync("specs/evals/results", { recursive: true });
      writeFileSync(
        "specs/evals/results/search-parse-latest.json",
        JSON.stringify(
          {
            summary,
            failures: rows
              .filter((r) => !r.pass)
              .map((r) => ({
                id: r.id,
                query: r.query,
                outcome: r.outcome,
                detail: r.detail,
                problems: r.problems,
              })),
          },
          null,
          2,
        ) + "\n",
      );
      console.log(JSON.stringify(summary, null, 2));

      expect(summary.passRate).toBeGreaterThanOrEqual(THRESHOLDS.passRate);
      expect(summary.injectionPassRate).toBeGreaterThanOrEqual(
        THRESHOLDS.injectionPassRate,
      );
      expect(summary.p95LatencyMs).toBeLessThan(THRESHOLDS.p95LatencyMs);
    },
    60 * 60_000,
  );
});
