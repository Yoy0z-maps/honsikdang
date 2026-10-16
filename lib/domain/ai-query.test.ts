import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CATEGORY_SLUGS,
  TAG_SLUGS,
  normalizeAiQuery,
  parseModelOutput,
  snapRadius,
  toFilters,
} from "./ai-query";
import { DEFAULT_FILTERS } from "./filters";

const empty = {
  categories: [],
  required_tags: [],
  max_price_krw: null,
  radius_m: null,
  keyword: null,
  place_mention: null,
  semantic_query: null,
  unsupported: [],
};

describe("parseModelOutput", () => {
  it("keeps valid conditions", () => {
    expect(
      parseModelOutput({
        ...empty,
        categories: ["japanese"],
        required_tags: ["solo_seat", "quiet"],
        max_price_krw: 10000,
        radius_m: 500,
        keyword: "라멘",
      }),
    ).toEqual({
      categories: ["japanese"],
      tags: ["solo_seat", "quiet"],
      maxPrice: 10000,
      radius: 500,
      keyword: "라멘",
      placeMention: null,
      semantic: "",
      unsupported: [],
    });
  });

  it("rejects the wrong shape so the caller falls back", () => {
    expect(parseModelOutput(null)).toBeNull();
    expect(parseModelOutput("{}")).toBeNull();
    expect(parseModelOutput({ ...empty, categories: "korean" })).toBeNull();
    expect(parseModelOutput({ ...empty, extra: 1 })).toBeNull();
    const missing: Record<string, unknown> = { ...empty };
    delete missing.unsupported;
    expect(parseModelOutput(missing)).toBeNull();
  });

  it("drops unknown slugs, folds case and dedupes", () => {
    const out = parseModelOutput({
      ...empty,
      categories: ["Korean", "korean", "pizza"],
      required_tags: ["SOLO_SEAT", "drop table"],
    })!;
    expect(out.categories).toEqual(["korean"]);
    expect(out.tags).toEqual(["solo_seat"]);
  });

  it("clamps prices and snaps radius to the filter options", () => {
    expect(
      parseModelOutput({ ...empty, max_price_krw: 500 })!.maxPrice,
    ).toBeNull();
    expect(
      parseModelOutput({ ...empty, max_price_krw: -1 })!.maxPrice,
    ).toBeNull();
    expect(parseModelOutput({ ...empty, max_price_krw: 9e9 })!.maxPrice).toBe(
      1_000_000,
    );
    expect(parseModelOutput({ ...empty, radius_m: 400 })!.radius).toBe(500);
    expect(parseModelOutput({ ...empty, radius_m: 99999 })!.radius).toBe(5000);
    expect(parseModelOutput({ ...empty, radius_m: 0 })!.radius).toBeNull();
    expect(snapRadius(300)).toBe(300);
  });

  it("cleans and bounds free text", () => {
    const out = parseModelOutput({
      ...empty,
      keyword: "  국밥\u0000​  집 ",
      place_mention: "",
      unsupported: [
        "영업 중",
        "영업 중",
        "a".repeat(200),
        "",
        "1",
        "2",
        "3",
        "4",
      ],
    })!;
    expect(out.keyword).toBe("국밥 집");
    expect(out.placeMention).toBeNull();
    expect(out.unsupported).toHaveLength(5);
    expect(out.unsupported[0]).toBe("영업 중");
    expect(out.unsupported[1]).toHaveLength(60);
  });
});

describe("toFilters", () => {
  it("keeps the map position and replaces every condition", () => {
    const base = { ...DEFAULT_FILTERS, zoom: 17, tags: ["quiet"], query: "x" };
    const filters = toFilters(
      parseModelOutput({ ...empty, categories: ["bunsik"] })!,
      base,
    );
    expect(filters).toEqual({
      ...DEFAULT_FILTERS,
      zoom: 17,
      categories: ["bunsik"],
    });
  });
});

describe("normalizeAiQuery", () => {
  it("bounds the query length", () => {
    expect(normalizeAiQuery(" ")).toBeNull();
    expect(normalizeAiQuery("가")).toBeNull();
    expect(normalizeAiQuery("  혼밥   하기 좋은 곳 ")).toBe(
      "혼밥 하기 좋은 곳",
    );
    expect(normalizeAiQuery("가".repeat(200))).toHaveLength(200);
    expect(normalizeAiQuery("가".repeat(201))).toBeNull();
  });
});

describe("slug lists", () => {
  it("match the categories and tags seeded by migrations", () => {
    const sql =
      readFileSync(
        "supabase/migrations/20261015005832_profiles_restaurants.sql",
        "utf8",
      ) +
      readFileSync(
        "supabase/migrations/20261015005836_reviews_tags.sql",
        "utf8",
      );
    for (const slug of [...CATEGORY_SLUGS, ...TAG_SLUGS]) {
      expect(sql).toContain(`('${slug}', '`);
    }
  });
});

describe("semantic preference", () => {
  it("is cleaned, bounded and carried into filters", () => {
    const parsed = parseModelOutput({
      ...empty,
      semantic_query: "  혼자 먹기\n편한  ",
    })!;
    expect(parsed.semantic).toBe("혼자 먹기 편한");
    expect(toFilters(parsed, DEFAULT_FILTERS).semantic).toBe("혼자 먹기 편한");
    expect(
      parseModelOutput({ ...empty, semantic_query: "가".repeat(300) })!
        .semantic,
    ).toHaveLength(100);
  });
});
