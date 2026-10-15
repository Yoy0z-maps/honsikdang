import { describe, expect, it } from "vitest";
import { loginPath, safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it.each([
    ["/restaurants/abc/review", "/restaurants/abc/review"],
    ["/me/reviews?saved=1", "/me/reviews?saved=1"],
    ["/", "/"],
  ])("keeps same-origin path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    "",
    "https://evil.example/",
    "//evil.example/path",
    "/\\evil.example",
    "javascript:alert(1)",
    "relative/path",
    "/\n/evil.example",
    `/${"a".repeat(600)}`,
  ])("rejects unsafe value %s", (input) => {
    expect(safeNextPath(input)).toBe("/");
  });

  it("normalizes dot segments without leaving the origin", () => {
    expect(safeNextPath("/a/../../b")).toBe("/b");
  });
});

describe("loginPath", () => {
  it("encodes a safe next path", () => {
    expect(loginPath("/me/reviews?x=1")).toBe(
      "/login?next=%2Fme%2Freviews%3Fx%3D1",
    );
    expect(loginPath("https://evil.example")).toBe("/login?next=%2F");
  });
});
