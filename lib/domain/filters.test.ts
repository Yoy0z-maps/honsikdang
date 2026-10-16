import { describe, expect, it } from "vitest";
import {
  DEFAULT_CENTER,
  DEFAULT_FILTERS,
  DEFAULT_ZOOM,
  activeFilterCount,
  clearFilters,
  filtersToSearchParams,
  hasExplicitCenter,
  parseFilters,
  toSearchArgs,
  type DiscoveryFilters,
} from "./filters";

const parse = (query: string) => parseFilters(new URLSearchParams(query));
const BOUNDS = { minLat: 37.55, minLng: 126.96, maxLat: 37.58, maxLng: 126.99 };

describe("parseFilters", () => {
  it("returns defaults for empty params (map-area search)", () => {
    expect(parse("")).toEqual(DEFAULT_FILTERS);
    expect(DEFAULT_FILTERS.radius).toBeNull();
  });

  it("reads every filter", () => {
    expect(
      parse(
        "lat=37.5&lng=127.01&z=17&radius=500&cat=korean,bunsik&max=10000&tags=solo_seat&q=국밥&sem=조용한",
      ),
    ).toEqual({
      center: { lat: 37.5, lng: 127.01 },
      zoom: 17,
      radius: 500,
      categories: ["korean", "bunsik"],
      maxPrice: 10000,
      tags: ["solo_seat"],
      query: "국밥",
      semantic: "조용한",
    });
  });

  it("falls back per field on invalid values", () => {
    const filters = parse(
      "lat=999&lng=127&z=40&radius=1234&max=-5&cat=Korean,ok_slug,,DROP%20TABLE&q=",
    );
    expect(filters.center).toEqual(DEFAULT_CENTER);
    expect(filters.zoom).toBe(DEFAULT_ZOOM);
    expect(filters.radius).toBeNull();
    expect(filters.maxPrice).toBeNull();
    expect(filters.categories).toEqual(["ok_slug"]);
  });

  it("requires both lat and lng", () => {
    expect(parse("lat=37.5").center).toEqual(DEFAULT_CENTER);
    expect(hasExplicitCenter(new URLSearchParams("lat=37.5"))).toBe(false);
    expect(hasExplicitCenter(new URLSearchParams("lat=37.5&lng=127"))).toBe(
      true,
    );
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
      zoom: 13,
      radius: 3000,
      categories: ["japanese"],
      maxPrice: 15000,
      tags: ["bar_seat", "quiet"],
      query: "덮밥",
      semantic: "혼자 먹기 편한",
    };
    expect(parseFilters(filtersToSearchParams(filters))).toEqual(filters);
  });
});

describe("activeFilterCount / clearFilters", () => {
  it("counts user-chosen filters but not the map position", () => {
    const filters = parse(
      "lat=37.5&lng=127&z=12&radius=500&cat=korean,bunsik&max=10000&tags=quiet&q=면",
    );
    expect(activeFilterCount(filters)).toBe(6);
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
  });

  it("clears filters but keeps the camera", () => {
    const filters = parse("lat=37.5&lng=127&z=12&cat=korean&q=면");
    expect(clearFilters(filters)).toEqual({
      ...DEFAULT_FILTERS,
      center: { lat: 37.5, lng: 127 },
      zoom: 12,
    });
  });
});

describe("toSearchArgs", () => {
  it("sends the map bounds when no radius is chosen", () => {
    const args = toSearchArgs(DEFAULT_FILTERS, BOUNDS, 40);
    expect(args).toMatchObject({
      center_lat: DEFAULT_CENTER.lat,
      center_lng: DEFAULT_CENTER.lng,
      min_lat: 37.55,
      min_lng: 126.96,
      max_lat: 37.58,
      max_lng: 126.99,
      result_offset: 40,
    });
    expect(args).not.toHaveProperty("radius_m");
  });

  it("sends only the radius when the radius filter is on", () => {
    const args = toSearchArgs({ ...DEFAULT_FILTERS, radius: 500 }, BOUNDS, 0);
    expect(args).toMatchObject({ radius_m: 500 });
    expect(args).not.toHaveProperty("min_lat");
  });

  it("leaves empty filters undefined so the RPC applies no constraint", () => {
    const args = toSearchArgs(DEFAULT_FILTERS, BOUNDS, 0);
    expect(args.category_slugs).toBeUndefined();
    expect(args.tag_slugs).toBeUndefined();
    expect(args.max_price).toBeUndefined();
    expect(args.query).toBeUndefined();
  });
});
