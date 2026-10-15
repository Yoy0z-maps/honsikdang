import { describe, expect, it } from "vitest";
import { formatDate, formatDistance, formatPrice } from "./format";
import { isValidLatLng, roundLatLng } from "./geo";

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

describe("geo", () => {
  it("validates coordinate ranges", () => {
    expect(isValidLatLng({ lat: 37.5, lng: 127 })).toBe(true);
    // Swapped Korean coordinates put 127 in the latitude slot: rejected.
    expect(isValidLatLng({ lat: 127, lng: 37.5 })).toBe(false);
    expect(isValidLatLng({ lat: 37.5, lng: 200 })).toBe(false);
    expect(isValidLatLng({ lat: Number.NaN, lng: 0 })).toBe(false);
  });

  it("rounds to 5 decimals", () => {
    expect(roundLatLng({ lat: 37.123456, lng: 127.987654 })).toEqual({
      lat: 37.12346,
      lng: 127.98765,
    });
  });
});
