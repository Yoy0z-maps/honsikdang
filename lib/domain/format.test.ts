import { describe, expect, it } from "vitest";
import { formatDate, formatDistance, formatPrice } from "./format";

describe("format", () => {
  it("formats distances", () => {
    expect(formatDistance(124)).toBe("124m");
    expect(formatDistance(1410)).toBe("1.4km");
  });

  it("formats prices in KRW", () => {
    expect(formatPrice(9500)).toBe("9,500원");
  });

  it("formats dates in Korea time", () => {
    expect(formatDate("2026-10-01")).toBe("2026.10.01");
    // 2026-09-30T20:00Z is already Oct 1 in Seoul.
    expect(formatDate("2026-09-30T20:00:00Z")).toBe("2026.10.01");
  });
});
