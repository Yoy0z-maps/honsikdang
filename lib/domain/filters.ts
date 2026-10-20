import { z } from "zod";
import type { Bounds, LatLng } from "./geo";

// Temporary default center: 서울시청 (decision Q7). Change when the launch
// area is decided (D-01).
export const DEFAULT_CENTER: LatLng = { lat: 37.5663, lng: 126.9779 };
export const DEFAULT_ZOOM = 15;
/**
 * Where the map opens when location is refused or unavailable and no area
 * was viewed before: 서울역 (decision C-82). DEFAULT_CENTER stays the URL
 * baseline so existing links keep their meaning.
 */
export const FALLBACK_CENTER: LatLng = { lat: 37.5547, lng: 126.9707 };
export const MIN_ZOOM = 6;
export const MAX_ZOOM = 21;
export const RADIUS_OPTIONS = [300, 500, 1000, 3000, 5000] as const;
export const BUDGET_OPTIONS = [7000, 10000, 15000, 20000] as const;
export const PAGE_SIZE = 20;
export const MAX_QUERY_LENGTH = 100;
const MAX_SLUGS = 20;

export type DiscoveryFilters = {
  center: LatLng;
  zoom: number;
  /** null = search the visible map area (default, decision Q21). */
  radius: number | null;
  categories: string[];
  maxPrice: number | null;
  tags: string[];
  query: string;
  /**
   * Soft preference from AI search; orders results by relevance instead of
   * distance and never filters them (WP-05b). "" = distance order.
   */
  semantic: string;
};

export const DEFAULT_FILTERS: DiscoveryFilters = {
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  radius: null,
  categories: [],
  maxPrice: null,
  tags: [],
  query: "",
  semantic: "",
};

const latSchema = z.coerce.number().min(-90).max(90);
const lngSchema = z.coerce.number().min(-180).max(180);
const zoomSchema = z.coerce.number().int().min(MIN_ZOOM).max(MAX_ZOOM);
const radiusSchema = z.coerce
  .number()
  .int()
  .refine((value) => (RADIUS_OPTIONS as readonly number[]).includes(value));
const priceSchema = z.coerce.number().int().min(0).max(1_000_000);
const slugSchema = z
  .string()
  .max(40)
  .regex(/^[a-z][a-z0-9_]*$/);

function parseSlugs(raw: string | null): string[] {
  if (!raw) return [];
  const slugs = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => slugSchema.safeParse(part).success);
  return [...new Set(slugs)].slice(0, MAX_SLUGS);
}

/** True when the URL already chooses a map position. */
export function hasExplicitCenter(params: URLSearchParams): boolean {
  return (
    latSchema.safeParse(params.get("lat") ?? undefined).success &&
    lngSchema.safeParse(params.get("lng") ?? undefined).success
  );
}

/**
 * Reads filters from URL search params. Invalid or missing values fall back
 * to defaults field by field; this never throws.
 */
export function parseFilters(params: URLSearchParams): DiscoveryFilters {
  const lat = latSchema.safeParse(params.get("lat") ?? undefined);
  const lng = lngSchema.safeParse(params.get("lng") ?? undefined);
  const zoom = zoomSchema.safeParse(params.get("z") ?? undefined);
  const radius = radiusSchema.safeParse(params.get("radius") ?? undefined);
  const maxPrice = priceSchema.safeParse(params.get("max") ?? undefined);

  return {
    center:
      lat.success && lng.success
        ? { lat: lat.data, lng: lng.data }
        : DEFAULT_CENTER,
    zoom: zoom.success ? zoom.data : DEFAULT_ZOOM,
    radius: radius.success ? radius.data : null,
    categories: parseSlugs(params.get("cat")),
    maxPrice: maxPrice.success ? maxPrice.data : null,
    tags: parseSlugs(params.get("tags")),
    query: (params.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH),
    semantic: (params.get("sem") ?? "").trim().slice(0, MAX_QUERY_LENGTH),
  };
}

/** Serializes filters to URL search params, omitting default values. */
export function filtersToSearchParams(
  filters: DiscoveryFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (
    filters.center.lat !== DEFAULT_CENTER.lat ||
    filters.center.lng !== DEFAULT_CENTER.lng
  ) {
    params.set("lat", filters.center.lat.toFixed(5));
    params.set("lng", filters.center.lng.toFixed(5));
  }
  if (filters.zoom !== DEFAULT_ZOOM) params.set("z", String(filters.zoom));
  if (filters.radius !== null) params.set("radius", String(filters.radius));
  if (filters.categories.length > 0)
    params.set("cat", filters.categories.join(","));
  if (filters.maxPrice !== null) params.set("max", String(filters.maxPrice));
  if (filters.tags.length > 0) params.set("tags", filters.tags.join(","));
  if (filters.query) params.set("q", filters.query);
  if (filters.semantic) params.set("sem", filters.semantic);
  return params;
}

/** Number of user-chosen filters (excluding map position). */
export function activeFilterCount(filters: DiscoveryFilters): number {
  return (
    filters.categories.length +
    filters.tags.length +
    (filters.maxPrice !== null ? 1 : 0) +
    (filters.radius !== null ? 1 : 0) +
    (filters.query ? 1 : 0)
  );
}

export function clearFilters(filters: DiscoveryFilters): DiscoveryFilters {
  return { ...DEFAULT_FILTERS, center: filters.center, zoom: filters.zoom };
}

/**
 * Arguments for the public.search_restaurants RPC. Exactly one area is
 * sent: the radius when the radius filter is on, otherwise `bounds`.
 */
export function toSearchArgs(
  filters: DiscoveryFilters,
  bounds: Bounds,
  offset: number,
  limit: number = PAGE_SIZE,
) {
  const area =
    filters.radius !== null
      ? { radius_m: filters.radius }
      : {
          min_lat: bounds.minLat,
          min_lng: bounds.minLng,
          max_lat: bounds.maxLat,
          max_lng: bounds.maxLng,
        };
  return {
    center_lat: filters.center.lat,
    center_lng: filters.center.lng,
    ...area,
    category_slugs:
      filters.categories.length > 0 ? filters.categories : undefined,
    max_price: filters.maxPrice ?? undefined,
    tag_slugs: filters.tags.length > 0 ? filters.tags : undefined,
    query: filters.query || undefined,
    result_limit: limit,
    result_offset: offset,
  };
}
