// Coordinate convention: the app and NAVER Maps use { lat, lng } objects
// (NAVER's LatLng constructor takes latitude first). PostGIS points are
// (longitude, latitude) and are built only inside SQL, so callers never
// pass positional pairs across that boundary.

export type LatLng = { lat: number; lng: number };

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
