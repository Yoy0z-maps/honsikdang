import { describe, expect, it } from "vitest";
import { shortWon } from "./RecommendPanel";

describe("shortWon", () => {
  it.each([
    [7000, "7천 원"],
    [10000, "1만 원"],
    [15000, "1만 5천 원"],
    [20000, "2만 원"],
  ])("%i → %s", (krw, text) => expect(shortWon(krw)).toBe(text));
});
