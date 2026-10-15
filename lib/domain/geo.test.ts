import { describe, expect, it } from "vitest";
import {
  MAX_BOUNDS_LAT_SPAN,
  MAX_BOUNDS_LNG_SPAN,
  approxDistanceMeters,
  isValidLatLng,
  roundLatLng,
  viewportBounds,
} from "./geo";

const CENTER = { lat: 37.5663, lng: 126.9779 };

describe("viewportBounds", () => {
  it("is centered on the map center", () => {
    const { bounds, clamped } = viewportBounds(CENTER, 15, 390, 844);
    expect(clamped).toBe(false);
    expect((bounds.minLng + bounds.maxLng) / 2).toBeCloseTo(CENTER.lng, 5);
    expect(bounds.minLat).toBeLessThan(CENTER.lat);
    expect(bounds.maxLat).toBeGreaterThan(CENTER.lat);
  });

  it("matches Web Mercator scale (390 px at zoom 15 is about 1.48 km wide)", () => {
    const { bounds } = viewportBounds(CENTER, 15, 390, 844);
    const widthM = approxDistanceMeters(
      { lat: CENTER.lat, lng: bounds.minLng },
      { lat: CENTER.lat, lng: bounds.maxLng },
    );
    // 156543.03 m/px × cos(37.57°) / 2^15 ≈ 3.785 m/px → 390 px ≈ 1476 m.
    expect(widthM).toBeGreaterThan(1450);
    expect(widthM).toBeLessThan(1500);
  });

  it("zooming in by one level halves the area span", () => {
    const a = viewportBounds(CENTER, 14, 390, 844).bounds;
    const b = viewportBounds(CENTER, 15, 390, 844).bounds;
    expect((a.maxLng - a.minLng) / (b.maxLng - b.minLng)).toBeCloseTo(2, 3);
  });

  it("clamps to the database limits when zoomed out", () => {
    const { bounds, clamped } = viewportBounds(CENTER, 8, 1280, 900);
    expect(clamped).toBe(true);
    expect(bounds.maxLat - bounds.minLat).toBeLessThanOrEqual(
      MAX_BOUNDS_LAT_SPAN + 1e-9,
    );
    expect(bounds.maxLng - bounds.minLng).toBeLessThanOrEqual(
      MAX_BOUNDS_LNG_SPAN + 1e-9,
    );
  });
});

describe("geo helpers", () => {
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
