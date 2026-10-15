import { z } from "zod";
import { MAX_ZOOM, MIN_ZOOM } from "./filters";
import { isValidLatLng, type LatLng } from "./geo";

export type Camera = { center: LatLng; zoom: number };

export type InitialCameraSource =
  "url" | "location" | "last-region" | "default";

/**
 * Initial map camera (master plan §5A): an explicit URL position wins, then
 * the user's location if permission was already granted (never prompt on
 * load), then the last region the user explicitly chose, then the default.
 */
export function chooseInitialCamera(options: {
  url: Camera | null;
  grantedLocation: LatLng | null;
  lastRegion: Camera | null;
  fallback: Camera;
}): { camera: Camera; source: InitialCameraSource } {
  if (options.url) return { camera: options.url, source: "url" };
  if (options.grantedLocation && isValidLatLng(options.grantedLocation)) {
    return {
      camera: { center: options.grantedLocation, zoom: options.fallback.zoom },
      source: "location",
    };
  }
  if (options.lastRegion) {
    return { camera: options.lastRegion, source: "last-region" };
  }
  return { camera: options.fallback, source: "default" };
}

const LAST_REGION_KEY = "honsikdang:last-region";

const cameraSchema = z.object({
  center: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  zoom: z.number().int().min(MIN_ZOOM).max(MAX_ZOOM),
});

/** Last explicitly chosen region, stored only in this browser. */
export function readLastRegion(storage: Storage | null): Camera | null {
  try {
    const raw = storage?.getItem(LAST_REGION_KEY);
    if (!raw) return null;
    const parsed = cameraSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeLastRegion(storage: Storage | null, camera: Camera) {
  try {
    storage?.setItem(LAST_REGION_KEY, JSON.stringify(camera));
  } catch {
    // Private mode or blocked storage: remembering the region is optional.
  }
}
