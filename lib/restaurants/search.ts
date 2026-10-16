import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { toSearchArgs, type DiscoveryFilters } from "@/lib/domain/filters";
import type { Bounds } from "@/lib/domain/geo";

// Generated RPC types mark aggregate columns as non-null, but they are null
// when a restaurant has no approved reviews/prices. Validate at the boundary.
const rowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  category_slug: z.string(),
  category_label: z.string(),
  distance_m: z.number(),
  review_count: z.number(),
  avg_solo_comfort: z.number().nullable(),
  median_price: z.number().nullable(),
  last_visited_at: z.string().nullable(),
  tag_review_count: z.number(),
  total_count: z.number(),
  excluded_no_price_count: z.number(),
});

export type RestaurantSummary = {
  id: string;
  name: string;
  address: string;
  position: { lat: number; lng: number };
  category: { slug: string; label: string };
  distanceM: number;
  reviewCount: number;
  avgSoloComfort: number | null;
  medianPrice: number | null;
  lastVisitedAt: string | null;
  tagReviewCount: number;
};

export type SearchPage = {
  items: RestaurantSummary[];
  total: number;
  excludedNoPrice: number;
};

export class SearchError extends Error {}

export async function searchRestaurants(
  client: SupabaseClient<Database>,
  filters: DiscoveryFilters,
  bounds: Bounds,
  offset: number,
  limit?: number,
): Promise<SearchPage> {
  const { data, error } = await client.rpc(
    "search_restaurants",
    toSearchArgs(filters, bounds, offset, limit),
  );
  if (error) throw new SearchError(error.message);

  const rows = z.array(rowSchema).safeParse(data);
  if (!rows.success) throw new SearchError("Unexpected search response shape");

  const first = rows.data[0];
  return {
    items: rows.data.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      position: { lat: row.lat, lng: row.lng },
      category: { slug: row.category_slug, label: row.category_label },
      distanceM: row.distance_m,
      reviewCount: row.review_count,
      avgSoloComfort: row.avg_solo_comfort,
      medianPrice: row.median_price,
      lastVisitedAt: row.last_visited_at,
      tagReviewCount: row.tag_review_count,
    })),
    // An empty page carries no counts; nothing matched.
    total: first?.total_count ?? 0,
    excludedNoPrice: first?.excluded_no_price_count ?? 0,
  };
}

export type CatalogueOption = { slug: string; label: string };
export type Catalogue = {
  categories: CatalogueOption[];
  tags: CatalogueOption[];
};

export async function fetchCatalogue(
  client: SupabaseClient<Database>,
): Promise<Catalogue> {
  const [categories, tags] = await Promise.all([
    client
      .from("restaurant_categories")
      .select("slug, label")
      .order("sort_order"),
    client.from("tags").select("slug, label").order("id"),
  ]);
  if (categories.error) throw new SearchError(categories.error.message);
  if (tags.error) throw new SearchError(tags.error.message);
  return { categories: categories.data, tags: tags.data };
}
