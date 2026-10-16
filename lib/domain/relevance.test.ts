import { describe, expect, it } from "vitest";
import { orderByRelevance } from "./relevance";

const items = ["a", "b", "c", "d"].map((id) => ({ id }));

describe("orderByRelevance", () => {
  it("orders by score and keeps distance order for ties", () => {
    const out = orderByRelevance(items, [
      { id: "c", score: 0.03 },
      { id: "b", score: 0.01 },
      { id: "d", score: 0.01 },
    ]);
    expect(out.map((i) => i.id)).toEqual(["c", "b", "d", "a"]);
  });

  it("never drops or adds items", () => {
    const out = orderByRelevance(items, [{ id: "zzz", score: 1 }]);
    expect(out.map((i) => i.id)).toEqual(["a", "b", "c", "d"]);
  });
});
