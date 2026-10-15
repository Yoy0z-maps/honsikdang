import { z } from "zod";
import type { LatLng } from "./geo";

// Temporary default center: 서울시청 (decision Q7). Change when the launch
// area is decided (D-01).
export const DEFAULT_CENTER: LatLng = { lat: 37.5663, lng: 126.9779 };
export const RADIUS_OPTIONS = [300, 500, 1000, 3000, 5000] as const;
export const DEFAULT_RADIUS = 1000;
export const BUDGET_OPTIONS = [7000, 10000, 15000, 20000] as const;
export const PAGE_SIZE = 20;
export const MAX_QUERY_LENGTH = 100;
const MAX_SLUGS = 20;

export type DiscoveryFilters = {
  center: LatLng;
  radius: number;
  categories: string[];
  maxPrice: number | null;
  tags: string[];
  query: string;
};

export const DEFAULT_FILTERS: DiscoveryFilters = {
  center: DEFAULT_CENTER,
  radius: DEFAULT_RADIUS,
  categories: [],
  maxPrice: null,
  tags: [],
  query: "",
};

const latSchema = z.coerce.number().min(-90).max(90);
const lngSchema = z.coerce.number().min(-180).max(180);
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

/**
 * Reads filters from URL search params. Invalid or missing values fall back
 * to defaults field by field; this never throws.
 */
export function parseFilters(params: URLSearchParams): DiscoveryFilters {
  const lat = latSchema.safeParse(params.get("lat") ?? undefined);
  const lng = lngSchema.safeParse(params.get("lng") ?? undefined);
  const radius = radiusSchema.safeParse(params.get("radius") ?? undefined);
  const maxPrice = priceSchema.safeParse(params.get("max") ?? undefined);

  return {
    center:
      lat.success && lng.success
        ? { lat: lat.data, lng: lng.data }
        : DEFAULT_CENTER,
    radius: radius.success ? radius.data : DEFAULT_RADIUS,
    categories: parseSlugs(params.get("cat")),
    maxPrice: maxPrice.success ? maxPrice.data : null,
    tags: parseSlugs(params.get("tags")),
    query: (params.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH),
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
  if (filters.radius !== DEFAULT_RADIUS)
    params.set("radius", String(filters.radius));
  if (filters.categories.length > 0)
    params.set("cat", filters.categories.join(","));
  if (filters.maxPrice !== null) params.set("max", String(filters.maxPrice));
  if (filters.tags.length > 0) params.set("tags", filters.tags.join(","));
  if (filters.query) params.set("q", filters.query);
  return params;
}

/** Arguments for the public.search_restaurants RPC. */
export function toSearchArgs(filters: DiscoveryFilters, offset: number) {
  return {
    center_lat: filters.center.lat,
    center_lng: filters.center.lng,
    radius_m: filters.radius,
    category_slugs:
      filters.categories.length > 0 ? filters.categories : undefined,
    max_price: filters.maxPrice ?? undefined,
    tag_slugs: filters.tags.length > 0 ? filters.tags : undefined,
    query: filters.query || undefined,
    result_limit: PAGE_SIZE,
    result_offset: offset,
  };
}
