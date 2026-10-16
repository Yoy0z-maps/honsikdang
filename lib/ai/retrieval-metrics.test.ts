import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ndcgAtK, recallAtK } from "./retrieval-metrics";

describe("recallAtK", () => {
  it("counts relevant items in the top k", () => {
    expect(recallAtK(["a", "b", "c"], { a: 2, c: 1, z: 1 }, 2)).toBeCloseTo(
      1 / 3,
    );
    expect(recallAtK(["a"], {}, 10)).toBe(1);
  });
});

describe("ndcgAtK", () => {
  it("is 1 for the ideal order and lower otherwise", () => {
    const grades = { a: 2, b: 1 };
    expect(ndcgAtK(["a", "b", "c"], grades, 10)).toBeCloseTo(1);
    expect(ndcgAtK(["b", "a", "c"], grades, 10)).toBeLessThan(1);
    expect(ndcgAtK(["c", "d"], grades, 10)).toBe(0);
  });
});

describe("retrieval corpus", () => {
  const corpus = JSON.parse(
    readFileSync("specs/evals/retrieval.corpus.json", "utf8"),
  ) as {
    restaurants: { n: number; name: string; reviews: string[] }[];
    queries: { id: string; relevant: Record<string, number> }[];
  };

  it("is clearly synthetic and fits one re-ranking call", () => {
    expect(corpus.restaurants.length).toBeLessThanOrEqual(50);
    for (const r of corpus.restaurants) expect(r.name).toMatch(/^\[평가용\] /);
  });

  it("labels only restaurants that exist", () => {
    const ids = new Set(corpus.restaurants.map((r) => String(r.n)));
    for (const q of corpus.queries) {
      for (const id of Object.keys(q.relevant))
        expect(ids.has(id), q.id).toBe(true);
    }
  });
});
