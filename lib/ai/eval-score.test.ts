import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ParsedQuery } from "@/lib/domain/ai-query";
import { parseModelOutput } from "@/lib/domain/ai-query";
import { percentile, scoreCase, type EvalCase } from "./eval-score";

const base: ParsedQuery = {
  categories: [],
  tags: [],
  maxPrice: null,
  radius: null,
  keyword: "",
  placeMention: null,
  semantic: "",
  unsupported: [],
};

describe("scoreCase", () => {
  it("passes exact hard fields regardless of order", () => {
    expect(
      scoreCase(
        { categories: ["korean"], tags: ["quiet", "solo_seat"] },
        { ...base, categories: ["korean"], tags: ["solo_seat", "quiet"] },
      ).pass,
    ).toBe(true);
  });

  it("fails extra or missing conditions", () => {
    expect(scoreCase({}, { ...base, maxPrice: 10000 }).pass).toBe(false);
    expect(scoreCase({ radius: 500 }, base).pass).toBe(false);
    expect(scoreCase({}, { ...base, keyword: "라멘" }).pass).toBe(false);
    expect(scoreCase({}, null)).toEqual({
      pass: false,
      problems: ["no valid output"],
    });
  });

  it("checks place and unsupported only when expected", () => {
    expect(scoreCase({}, { ...base, placeMention: "강남역" }).pass).toBe(true);
    expect(scoreCase({ place: "강남역" }, base).pass).toBe(false);
    expect(scoreCase({ unsupported: true }, base).pass).toBe(false);
    expect(
      scoreCase({ keyword: "모모스" }, { ...base, keyword: "모모스 카페" })
        .pass,
    ).toBe(true);
  });
});

describe("percentile", () => {
  it("uses nearest rank", () => {
    expect(percentile([5, 1, 3, 2, 4], 95)).toBe(5);
    expect(percentile([1, 2, 3, 4], 50)).toBe(2);
    expect(percentile([], 95)).toBe(0);
  });
});

describe("evaluation cases", () => {
  const { cases } = JSON.parse(
    readFileSync("specs/evals/search-parse.cases.json", "utf8"),
  ) as { cases: EvalCase[] };

  it("has about 50 unique cases with injections", () => {
    expect(cases.length).toBeGreaterThanOrEqual(45);
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
    expect(
      cases.filter((c) => c.kind === "injection").length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("only expects values the parser can produce", () => {
    for (const c of cases) {
      const e = c.expect;
      const raw = {
        categories: e.categories ?? [],
        required_tags: e.tags ?? [],
        max_price_krw: e.maxPrice ?? null,
        radius_m: e.radius ?? null,
        keyword: e.keyword ?? null,
        place_mention: e.place ?? null,
        semantic_query: null,
        unsupported: e.unsupported ? ["x"] : [],
      };
      expect(scoreCase(e, parseModelOutput(raw)), c.id).toEqual({
        pass: true,
        problems: [],
      });
    }
  });
});

describe("noSemantic", () => {
  it("fails when a negation leaks into the soft preference", () => {
    expect(
      scoreCase({ noSemantic: true }, { ...base, semantic: "기다리지 않는" })
        .pass,
    ).toBe(false);
    expect(scoreCase({ noSemantic: true }, base).pass).toBe(true);
  });
});
