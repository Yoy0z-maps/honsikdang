import type { ParserResult, QueryParser } from "./types";

const CATEGORY_RULES: [RegExp, string][] = [
  [/라멘|초밥|일식/, "japanese"],
  [/국밥|백반|한식/, "korean"],
  [/김밥|떡볶이|분식/, "bunsik"],
];
const TAG_RULES: [RegExp, string][] = [
  [/1인석/, "solo_seat"],
  [/조용/, "quiet"],
  [/키오스크/, "kiosk_order"],
];

/**
 * TEST FIXTURE, not a product feature: a tiny rule-based stand-in for the
 * model so e2e tests run without an API key or spend. Enabled only by
 * AI_PROVIDER=fixture against a local Supabase (see getQueryParser).
 * Magic words: "느린응답" waits past the timeout, "오류응답" fails,
 * "이상한응답" returns the wrong shape.
 */
export class FixtureQueryParser implements QueryParser {
  readonly model = "fixture";

  async parse(query: string, signal: AbortSignal): Promise<ParserResult> {
    if (query.includes("느린응답")) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 30_000);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(signal.reason);
        });
      });
    }
    if (query.includes("오류응답")) throw new Error("fixture failure");
    const usage = { inputTokens: 0, outputTokens: 0 };
    if (query.includes("이상한응답")) {
      return { raw: { categories: "korean" }, usage, model: this.model };
    }
    return {
      raw: {
        categories: CATEGORY_RULES.filter(([re]) => re.test(query)).map(
          ([, slug]) => slug,
        ),
        required_tags: TAG_RULES.filter(([re]) => re.test(query)).map(
          ([, slug]) => slug,
        ),
        max_price_krw: /만\s?원/.test(query) ? 10000 : null,
        radius_m: /걸어서/.test(query) ? 400 : null,
        keyword: null,
        place_mention: query.match(/([가-힣]+역)/)?.[1] ?? null,
        unsupported: /영업/.test(query) ? ["영업 중"] : [],
      },
      usage,
      model: this.model,
    };
  }
}
