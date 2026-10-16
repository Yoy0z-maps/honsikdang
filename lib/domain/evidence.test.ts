import { describe, expect, it } from "vitest";
import { QUOTE_MAX_LENGTH, isVerbatimExcerpt, toQuote } from "./evidence";

describe("toQuote", () => {
  it("keeps short reviews whole and collapses whitespace", () => {
    expect(toQuote("  조용해서\n혼자 먹기 좋다 ")).toBe(
      "조용해서 혼자 먹기 좋다",
    );
  });

  it("cuts long reviews at the end only", () => {
    const body = "가".repeat(200);
    const quote = toQuote(body);
    expect(quote.length).toBe(QUOTE_MAX_LENGTH);
    expect(quote.endsWith("…")).toBe(true);
    expect(isVerbatimExcerpt(quote, body)).toBe(true);
  });
});

describe("isVerbatimExcerpt", () => {
  it("rejects anything that is not a prefix of the review", () => {
    expect(isVerbatimExcerpt("조용하다", "시끄럽다")).toBe(false);
    expect(isVerbatimExcerpt("…", "시끄럽다")).toBe(false);
    expect(isVerbatimExcerpt("혼자 먹기", "조용해서 혼자 먹기 좋다")).toBe(
      false,
    );
  });
});
