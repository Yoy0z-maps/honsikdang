import { describe, expect, it } from "vitest";
import {
  DEFAULT_CENTER,
  DEFAULT_FILTERS,
  DEFAULT_RADIUS,
  filtersToSearchParams,
  parseFilters,
  toSearchArgs,
  type DiscoveryFilters,
} from "./filters";

const parse = (query: string) => parseFilters(new URLSearchParams(query));

describe("parseFilters", () => {
  it("returns defaults for empty params", () => {
    expect(parse("")).toEqual(DEFAULT_FILTERS);
  });

  it("reads every filter", () => {
    expect(
      parse(
        "lat=37.5&lng=127.01&radius=500&cat=korean,bunsik&max=10000&tags=solo_seat&q=국밥",
      ),
    ).toEqual({
      center: { lat: 37.5, lng: 127.01 },
      radius: 500,
      categories: ["korean", "bunsik"],
      maxPrice: 10000,
      tags: ["solo_seat"],
      query: "국밥",
    });
  });

  it("falls back per field on invalid values", () => {
    const filters = parse(
      "lat=999&lng=127&radius=1234&max=-5&cat=Korean,ok_slug,,DROP%20TABLE&q=",
    );
    expect(filters.center).toEqual(DEFAULT_CENTER);
    expect(filters.radius).toBe(DEFAULT_RADIUS);
    expect(filters.maxPrice).toBeNull();
    expect(filters.categories).toEqual(["ok_slug"]);
  });

  it("requires both lat and lng", () => {
    expect(parse("lat=37.5").center).toEqual(DEFAULT_CENTER);
  });

  it("deduplicates and caps slug lists", () => {
    const many = Array.from({ length: 30 }, (_, i) => `t${i}`).join(",");
    expect(parse("tags=a,a,b").tags).toEqual(["a", "b"]);
    expect(parse(`tags=${many}`).tags).toHaveLength(20);
  });

  it("trims and truncates the query", () => {
    expect(parse(`q=${"가".repeat(150)}`).query).toHaveLength(100);
    expect(parse("q=%20%20라멘%20").query).toBe("라멘");
  });
});

describe("filtersToSearchParams", () => {
  it("omits defaults", () => {
    expect(filtersToSearchParams(DEFAULT_FILTERS).toString()).toBe("");
  });

  it("round-trips through parseFilters", () => {
    const filters: DiscoveryFilters = {
      center: { lat: 37.51234, lng: 127.05678 },
      radius: 3000,
      categories: ["japanese"],
      maxPrice: 15000,
      tags: ["bar_seat", "quiet"],
      query: "덮밥",
    };
    expect(parseFilters(filtersToSearchParams(filters))).toEqual(filters);
  });
});

describe("toSearchArgs", () => {
  it("maps lat/lng to the named RPC arguments without swapping", () => {
    const args = toSearchArgs(
      { ...DEFAULT_FILTERS, center: { lat: 37.1, lng: 127.2 } },
      40,
    );
    expect(args.center_lat).toBe(37.1);
    expect(args.center_lng).toBe(127.2);
    expect(args.result_offset).toBe(40);
  });

  it("leaves empty filters undefined so the RPC applies no constraint", () => {
    const args = toSearchArgs(DEFAULT_FILTERS, 0);
    expect(args.category_slugs).toBeUndefined();
    expect(args.tag_slugs).toBeUndefined();
    expect(args.max_price).toBeUndefined();
    expect(args.query).toBeUndefined();
  });
});
