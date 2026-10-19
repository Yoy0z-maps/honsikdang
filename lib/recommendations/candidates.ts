import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_FILTERS, type DiscoveryFilters } from "@/lib/domain/filters";
import type { Bounds } from "@/lib/domain/geo";
import {
  MOOD_TAGS,
  type Candidate,
  type RecommendInput,
} from "@/lib/domain/recommend";
import { RELEVANCE_CANDIDATES } from "@/lib/domain/relevance";
import { searchRestaurants } from "@/lib/restaurants/search";
import type { Database } from "@/lib/supabase/database.types";

export type CandidatePool = { candidates: Candidate[]; capped: boolean };

/**
 * Candidates for "오늘 뭐 먹지?" (Q57): approved restaurants in the visible
 * map area, nearest first, through the same public search as the map. The
 * budget is applied by the recommender (unknown prices stay eligible, Q58);
 * moods only add score, so each mood's tag is looked up separately rather
 * than used as a filter.
 */
export async function fetchCandidates(
  client: SupabaseClient<Database>,
  area: Pick<DiscoveryFilters, "center" | "zoom" | "radius">,
  bounds: Bounds,
  input: RecommendInput,
): Promise<CandidatePool> {
  const base: DiscoveryFilters = {
    ...DEFAULT_FILTERS,
    ...area,
    categories: input.include,
  };
  const [all, ...withMood] = await Promise.all([
    searchRestaurants(client, base, bounds, 0, RELEVANCE_CANDIDATES),
    ...input.moods.map((mood) =>
      searchRestaurants(
        client,
        { ...base, tags: [MOOD_TAGS[mood]] },
        bounds,
        0,
        RELEVANCE_CANDIDATES,
      ),
    ),
  ]);
  const moodIds = withMood.map((page) => new Set(page.items.map((i) => i.id)));
  return {
    capped: all.total > all.items.length,
    candidates: all.items.map((r) => ({
      id: r.id,
      name: r.name,
      categorySlug: r.category.slug,
      categoryLabel: r.category.label,
      position: r.position,
      distanceM: r.distanceM,
      reviewCount: r.reviewCount,
      avgSoloComfort: r.avgSoloComfort,
      medianPrice: r.medianPrice,
      lastVisitedAt: r.lastVisitedAt,
      moodsMatched: input.moods.filter((_, i) => moodIds[i].has(r.id)),
    })),
  };
}
