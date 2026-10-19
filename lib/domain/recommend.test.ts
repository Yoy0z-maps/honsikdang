import { describe, expect, it } from "vitest";
import {
  PICK_COUNT,
  recommend,
  scoreCandidate,
  shrunkComfort,
  type Candidate,
  type RecommendInput,
} from "./recommend";

const TODAY = "2026-10-19";
const NONE: RecommendInput = {
  budget: null,
  include: [],
  exclude: [],
  moods: [],
};

let n = 0;
function c(over: Partial<Candidate>): Candidate {
  n++;
  return {
    id: `r${String(n).padStart(2, "0")}`,
    name: `식당 ${n}`,
    categorySlug: "korean",
    categoryLabel: "한식",
    position: { lat: 37.5, lng: 127 },
    distanceM: 300,
    reviewCount: 3,
    avgSoloComfort: 4,
    medianPrice: 9000,
    lastVisitedAt: "2026-10-10",
    moodsMatched: [],
    ...over,
  };
}

const ids = (r: ReturnType<typeof recommend>) =>
  r.picks.map((p) => p.candidate.id);

describe("eligibility (Q62: hard constraints are never violated)", () => {
  const pool = [
    c({ categorySlug: "korean", medianPrice: 8000 }),
    c({ categorySlug: "japanese", medianPrice: 15000 }),
    c({ categorySlug: "chinese", medianPrice: 9500 }),
    c({ categorySlug: "bunsik", medianPrice: null }),
    c({ categorySlug: "western", medianPrice: 30000 }),
  ];

  it("drops known prices over budget and keeps unknown prices, labeled", () => {
    const r = recommend(pool, { ...NONE, budget: 10000 }, TODAY);
    for (const p of r.picks) {
      expect(
        p.candidate.medianPrice === null || p.candidate.medianPrice <= 10000,
      ).toBe(true);
    }
    expect(r.excludedByBudget).toBe(2);
    const unknown = r.picks.find((p) => p.candidate.medianPrice === null)!;
    expect(unknown.badges).toContain("no_price");
    expect(unknown.reasons).toContain(
      "가격 정보가 없어 예산을 확인하지 못했어요",
    );
  });

  it("never returns excluded categories, and only included ones when set", () => {
    const r1 = recommend(
      pool,
      { ...NONE, exclude: ["korean", "chinese"] },
      TODAY,
    );
    expect(r1.picks.map((p) => p.candidate.categorySlug)).not.toContain(
      "korean",
    );
    expect(r1.picks.map((p) => p.candidate.categorySlug)).not.toContain(
      "chinese",
    );
    const r2 = recommend(pool, { ...NONE, include: ["japanese"] }, TODAY);
    expect(r2.picks.map((p) => p.candidate.categorySlug)).toEqual(["japanese"]);
  });

  it("holds over many random pools", () => {
    const cats = ["korean", "japanese", "chinese", "bunsik"];
    for (let seed = 1; seed <= 200; seed++) {
      const rnd = (k: number) => ((seed * 9301 + k * 49297) % 233280) / 233280;
      const randomPool = Array.from({ length: 12 }, (_, i) =>
        c({
          categorySlug: cats[Math.floor(rnd(i) * 4)],
          medianPrice:
            rnd(i + 50) < 0.2 ? null : Math.round(5000 + rnd(i + 99) * 20000),
          reviewCount: Math.floor(rnd(i + 7) * 5),
          distanceM: Math.round(rnd(i + 3) * 3000),
        }),
      );
      const input = {
        budget: 12000,
        include: [],
        exclude: ["chinese"],
        moods: [],
      };
      for (const p of recommend(randomPool, input, TODAY).picks) {
        expect(p.candidate.categorySlug).not.toBe("chinese");
        expect(
          p.candidate.medianPrice === null || p.candidate.medianPrice <= 12000,
        ).toBe(true);
      }
    }
  });
});

describe("missing data", () => {
  it("shrinks small samples toward 3.5", () => {
    expect(shrunkComfort(5, 1)).toBeCloseTo((5 + 3.5 * 3) / 4);
    expect(shrunkComfort(null, 0)).toBe(3.5);
    expect(shrunkComfort(5, 20)).toBeGreaterThan(shrunkComfort(5, 1));
  });

  it("allows at most one place without reviews, marked as new", () => {
    const pool = [
      c({
        reviewCount: 0,
        avgSoloComfort: null,
        lastVisitedAt: null,
        distanceM: 10,
        categorySlug: "a",
      }),
      c({
        reviewCount: 0,
        avgSoloComfort: null,
        lastVisitedAt: null,
        distanceM: 20,
        categorySlug: "b",
      }),
      c({ categorySlug: "c" }),
      c({ categorySlug: "d" }),
    ];
    const r = recommend(pool, NONE, TODAY);
    const fresh = r.picks.filter((p) => p.candidate.reviewCount === 0);
    expect(fresh).toHaveLength(1);
    expect(fresh[0].badges).toContain("new");
    expect(fresh[0].reasons[0]).toBe("아직 승인된 리뷰가 없어요");
  });

  it("allows at most one unknown price when a budget is set", () => {
    const pool = ["a", "b", "c"].map((cat) =>
      c({ categorySlug: cat, medianPrice: null }),
    );
    const r = recommend(pool, { ...NONE, budget: 10000 }, TODAY);
    expect(r.picks).toHaveLength(1);
    expect(r.shortfall).toMatch(/^조건에 맞는 식당이 1곳뿐이에요\./);
  });

  it("explains an empty result instead of returning nothing silently", () => {
    const r = recommend(
      [c({ medianPrice: 50000 })],
      { ...NONE, budget: 10000 },
      TODAY,
    );
    expect(r.picks).toEqual([]);
    expect(r.shortfall).toBe(
      "추천할 수 있는 식당이 없어요. 예산을 넘는 1곳을 뺐어요 · 지도를 옮기거나 넓혀 보세요.",
    );
    expect(recommend([], NONE, TODAY).shortfall).toBe(
      "추천할 수 있는 식당이 없어요. 지도를 옮기거나 넓혀 보세요.",
    );
  });

  it("only states facts it has (no price, rating or visit text when unknown)", () => {
    const bare = c({
      reviewCount: 0,
      avgSoloComfort: null,
      medianPrice: null,
      lastVisitedAt: null,
    });
    const [pick] = recommend([bare], NONE, TODAY).picks;
    expect(pick.reasons).toEqual([
      "아직 승인된 리뷰가 없어요",
      "지도 중심에서 300m",
    ]);
  });
});

describe("diversity and exploration (Q60)", () => {
  const pool = [
    c({ categorySlug: "korean", avgSoloComfort: 5, reviewCount: 9 }),
    c({ categorySlug: "korean", avgSoloComfort: 5, reviewCount: 8 }),
    c({ categorySlug: "korean", avgSoloComfort: 4.9, reviewCount: 8 }),
    c({ categorySlug: "japanese", avgSoloComfort: 3, reviewCount: 2 }),
    c({ categorySlug: "bunsik", avgSoloComfort: 3, reviewCount: 2 }),
  ];

  it("prefers different categories over a slightly higher score", () => {
    const cats = recommend(pool, NONE, TODAY).picks.map(
      (p) => p.candidate.categorySlug,
    );
    expect(new Set(cats).size).toBe(PICK_COUNT);
  });

  it("falls back to repeating a category when there is no alternative", () => {
    const koreanOnly = pool.slice(0, 3);
    expect(recommend(koreanOnly, NONE, TODAY).picks).toHaveLength(3);
  });

  it("'다른 추천 보기' skips what was already shown", () => {
    const first = recommend(pool, NONE, TODAY);
    const second = recommend(pool, NONE, TODAY, new Set(ids(first)));
    expect(ids(second).some((id) => ids(first).includes(id))).toBe(false);
    expect(second.shortfall).toContain("이미 본 추천은 다시 보여 주지 않아요");
  });
});

describe("scoring", () => {
  it("rewards matching moods", () => {
    const quiet = c({ moodsMatched: ["quiet"] });
    const plain = c({});
    const input = { ...NONE, moods: ["quiet" as const] };
    expect(scoreCandidate(quiet, input, 1000, TODAY)).toBeGreaterThan(
      scoreCandidate(plain, input, 1000, TODAY),
    );
    const [top] = recommend([plain, quiet], input, TODAY).picks;
    expect(top.candidate.id).toBe(quiet.id);
    expect(top.reasons).toContain("'조용히' 관련 특성이 리뷰에 있어요");
  });

  it("is deterministic, including ties", () => {
    const twins = [c({ categorySlug: "x" }), c({ categorySlug: "y" })];
    const a = ids(recommend(twins, NONE, TODAY));
    const b = ids(recommend([...twins].reverse(), NONE, TODAY));
    expect(a).toEqual(b);
  });
});
