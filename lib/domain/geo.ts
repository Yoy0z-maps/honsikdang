// Coordinate convention: the app and NAVER Maps use { lat, lng } objects
// (NAVER's LatLng constructor takes latitude first). PostGIS points are
// (longitude, latitude) and are built only inside SQL, so callers never
// pass positional pairs across that boundary.

export type LatLng = { lat: number; lng: number };
export type Bounds = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

// Mirrors the limits enforced by public.search_restaurants.
export const MAX_BOUNDS_LAT_SPAN = 0.2;
export const MAX_BOUNDS_LNG_SPAN = 0.25;

export function isValidLatLng(value: LatLng): boolean {
  return (
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    value.lng >= -180 &&
    value.lng <= 180
  );
}

/**
 * Approximate ground distance in meters (equirectangular). Good enough for
 * UI decisions such as "has the map moved"; the database computes real
 * geodesic distances.
 */
export function approxDistanceMeters(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * 6_371_000;
}

/** Rounds to 5 decimals (~1 m), enough for search centers and URLs. */
export function roundLatLng(value: LatLng): LatLng {
  return {
    lat: Math.round(value.lat * 1e5) / 1e5,
    lng: Math.round(value.lng * 1e5) / 1e5,
  };
}

/**
 * Visible area for a Web Mercator map with 256 px tiles at `zoom`, centered
 * on `center`, in a `width` × `height` CSS px viewport. Used for searching
 * so results do not depend on whether the map SDK has loaded.
 * Returns `clamped: true` when the area had to be shrunk to the database
 * limits (the user should zoom in).
 */
export function viewportBounds(
  center: LatLng,
  zoom: number,
  width: number,
  height: number,
): { bounds: Bounds; clamped: boolean } {
  const worldPx = 256 * 2 ** zoom;
  const lngSpan = (width / worldPx) * 360;
  const mercY = (lat: number) =>
    Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const latFromY = (y: number) => (360 / Math.PI) * Math.atan(Math.exp(y)) - 90;
  const centerY = mercY(center.lat);
  const halfY = (height / worldPx) * Math.PI;
  let minLat = latFromY(centerY - halfY);
  let maxLat = latFromY(centerY + halfY);
  let halfLng = lngSpan / 2;

  let clamped = false;
  if (maxLat - minLat > MAX_BOUNDS_LAT_SPAN) {
    minLat = center.lat - MAX_BOUNDS_LAT_SPAN / 2;
    maxLat = center.lat + MAX_BOUNDS_LAT_SPAN / 2;
    clamped = true;
  }
  if (halfLng * 2 > MAX_BOUNDS_LNG_SPAN) {
    halfLng = MAX_BOUNDS_LNG_SPAN / 2;
    clamped = true;
  }

  const round = (n: number) => Math.round(n * 1e6) / 1e6;
  return {
    bounds: {
      minLat: round(Math.max(-90, minLat)),
      maxLat: round(Math.min(90, maxLat)),
      minLng: round(Math.max(-180, center.lng - halfLng)),
      maxLng: round(Math.min(180, center.lng + halfLng)),
    },
    clamped,
  };
}
