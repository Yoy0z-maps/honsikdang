// NAVER Map app deep links for directions (decision Q33/Q34).
// Source: https://guide.ncloud-docs.com/docs/en/maps-url-scheme (2026-10-15)
//   nmap://route/{public|car|walk|bicycle}?dlat&dlng[&dname]&appname
//   - only the destination is required; without slat/slng the app starts
//     from the user's current location, so we never send the user's location
//   - appname is required; for mobile web it is the page URL
//   - Android: an intent URL with the app package falls back to Google Play
//   - iOS: open nmap:// and fall back to the App Store after a timeout
// The guide documents no web (desktop) directions URL, so none is built.

export type TravelMode = "walk" | "public" | "car" | "bicycle";
export type Platform = "android" | "ios" | "other";

export const NAVER_MAP_ANDROID_PACKAGE = "com.nhn.android.nmap";
export const NAVER_MAP_APP_STORE_URL =
  "https://itunes.apple.com/app/id311867728?mt=8";

// Coordinate ranges accepted by the URL scheme (Korea).
const LAT_RANGE = [31.43, 44.35] as const;
const LNG_RANGE = [122.37, 132.0] as const;

export type Destination = { lat: number; lng: number; name: string };

export type DirectionsLink =
  | { kind: "android"; href: string }
  | { kind: "ios"; href: string; fallbackHref: string }
  | { kind: "unsupported" };

export function detectPlatform(userAgent: string): Platform {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  return "other";
}

function inRange(value: number, [min, max]: readonly [number, number]) {
  return Number.isFinite(value) && value >= min && value <= max;
}

/** Query string for /route/*; null when the destination is outside the scheme's range. */
function routeQuery(destination: Destination, appname: string): string | null {
  if (
    !inRange(destination.lat, LAT_RANGE) ||
    !inRange(destination.lng, LNG_RANGE)
  ) {
    return null;
  }
  if (!appname) throw new Error("appname is required by the NAVER URL scheme");
  // encodeURIComponent (not URLSearchParams) so spaces become %20, not "+".
  const params: [string, string][] = [
    ["dlat", destination.lat.toFixed(7)],
    ["dlng", destination.lng.toFixed(7)],
    ["dname", destination.name],
    ["appname", appname],
  ];
  return params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}

/** nmap:// route URL, or null when the destination is outside Korea. */
export function naverRouteUrl(
  destination: Destination,
  appname: string,
  mode: TravelMode = "walk",
): string | null {
  const query = routeQuery(destination, appname);
  return query === null ? null : `nmap://route/${mode}?${query}`;
}

export function directionsLink(
  destination: Destination,
  platform: Platform,
  appname: string,
  mode: TravelMode = "walk",
): DirectionsLink {
  const query = routeQuery(destination, appname);
  if (query === null || platform === "other") return { kind: "unsupported" };
  if (platform === "android") {
    return {
      kind: "android",
      href: `intent://route/${mode}?${query}#Intent;scheme=nmap;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=${NAVER_MAP_ANDROID_PACKAGE};end`,
    };
  }
  return {
    kind: "ios",
    href: `nmap://route/${mode}?${query}`,
    fallbackHref: NAVER_MAP_APP_STORE_URL,
  };
}
