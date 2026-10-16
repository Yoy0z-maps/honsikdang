import { z } from "zod";
import {
  MAX_QUERY_LENGTH,
  RADIUS_OPTIONS,
  type DiscoveryFilters,
} from "./filters";

// Natural-language search (WP-05a). The model only translates a query into
// these fields; everything it returns is untrusted and validated here.

export const AI_QUERY_MAX_LENGTH = 200;

// Must match public.restaurant_categories / public.tags (checked in tests).
export const CATEGORY_SLUGS = [
  "korean",
  "japanese",
  "chinese",
  "western",
  "bunsik",
  "asian",
  "fast_food",
  "cafe_bakery",
  "other",
] as const;
export const TAG_SLUGS = [
  "solo_seat",
  "bar_seat",
  "solo_menu",
  "kiosk_order",
  "quick_turnover",
  "quiet",
] as const;

const MIN_PRICE = 1000;
const MAX_PRICE = 1_000_000;
const MAX_TEXT = 60;
const MAX_UNSUPPORTED = 5;
export const MAX_SEMANTIC_LENGTH = MAX_QUERY_LENGTH;

/**
 * JSON schema sent as the structured-output format. The API does not accept
 * numeric or length constraints, so those are enforced in parseModelOutput.
 */
export const AI_QUERY_JSON_SCHEMA = {
  type: "object",
  properties: {
    categories: {
      type: "array",
      items: { type: "string", enum: [...CATEGORY_SLUGS] },
    },
    required_tags: {
      type: "array",
      items: { type: "string", enum: [...TAG_SLUGS] },
    },
    max_price_krw: { anyOf: [{ type: "integer" }, { type: "null" }] },
    radius_m: { anyOf: [{ type: "integer" }, { type: "null" }] },
    keyword: { anyOf: [{ type: "string" }, { type: "null" }] },
    place_mention: { anyOf: [{ type: "string" }, { type: "null" }] },
    semantic_query: { anyOf: [{ type: "string" }, { type: "null" }] },
    unsupported: { type: "array", items: { type: "string" } },
  },
  required: [
    "categories",
    "required_tags",
    "max_price_krw",
    "radius_m",
    "keyword",
    "place_mention",
    "semantic_query",
    "unsupported",
  ],
  additionalProperties: false,
} as const;

export type ParsedQuery = {
  categories: string[];
  tags: string[];
  maxPrice: number | null;
  radius: number | null;
  keyword: string;
  /** Area named in the query; not geocoded (decision Q40). */
  placeMention: string | null;
  /**
   * Soft preferences ("혼자 먹기 편한") used only to re-order results, never
   * to filter them (WP-05b, decision Q47). Empty when none.
   */
  semantic: string;
  /** Conditions the app cannot apply, shown to the user. */
  unsupported: string[];
};

const rawSchema = z
  .object({
    categories: z.array(z.string()),
    required_tags: z.array(z.string()),
    max_price_krw: z.number().nullable(),
    radius_m: z.number().nullable(),
    keyword: z.string().nullable(),
    place_mention: z.string().nullable(),
    semantic_query: z.string().nullable(),
    unsupported: z.array(z.string()),
  })
  .strict();

function cleanText(value: string | null, max: number): string {
  // Collapse whitespace and drop control characters.
  return (value ?? "")
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function pickEnum(values: string[], allowed: readonly string[]): string[] {
  // The API may change enum casing; compare case-insensitively.
  const picked = values
    .map((v) => v.trim().toLowerCase())
    .filter((v) => allowed.includes(v));
  return [...new Set(picked)];
}

/** Smallest radius option that covers the request; 5 km at most. */
export function snapRadius(meters: number): number {
  const options = RADIUS_OPTIONS as readonly number[];
  return options.find((option) => option >= meters) ?? options.at(-1)!;
}

/**
 * Validates and clamps model output. Returns null when the shape is wrong;
 * the caller then falls back to keyword search.
 */
export function parseModelOutput(raw: unknown): ParsedQuery | null {
  const parsed = rawSchema.safeParse(raw);
  if (!parsed.success) return null;
  const o = parsed.data;

  const price =
    o.max_price_krw !== null && Number.isFinite(o.max_price_krw)
      ? Math.round(o.max_price_krw)
      : null;
  const radius =
    o.radius_m !== null && Number.isFinite(o.radius_m) && o.radius_m > 0
      ? snapRadius(o.radius_m)
      : null;

  const unsupported = [
    ...new Set(o.unsupported.map((u) => cleanText(u, MAX_TEXT))),
  ]
    .filter(Boolean)
    .slice(0, MAX_UNSUPPORTED);

  return {
    categories: pickEnum(o.categories, CATEGORY_SLUGS),
    tags: pickEnum(o.required_tags, TAG_SLUGS),
    maxPrice:
      price !== null && price >= MIN_PRICE ? Math.min(price, MAX_PRICE) : null,
    radius,
    keyword: cleanText(o.keyword, MAX_QUERY_LENGTH),
    placeMention: cleanText(o.place_mention, MAX_TEXT) || null,
    semantic: cleanText(o.semantic_query, MAX_SEMANTIC_LENGTH),
    unsupported,
  };
}

/** Applies parsed conditions on top of the current map position. */
export function toFilters(
  parsed: ParsedQuery,
  base: DiscoveryFilters,
): DiscoveryFilters {
  return {
    center: base.center,
    zoom: base.zoom,
    radius: parsed.radius,
    categories: parsed.categories,
    maxPrice: parsed.maxPrice,
    tags: parsed.tags,
    query: parsed.keyword,
    semantic: parsed.semantic,
  };
}

/** Normalizes the user's query before it is sent anywhere. */
export function normalizeAiQuery(input: string): string | null {
  const text = cleanText(input, AI_QUERY_MAX_LENGTH + 1);
  if (text.length < 2 || text.length > AI_QUERY_MAX_LENGTH) return null;
  return text;
}
