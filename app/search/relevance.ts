"use server";

import { z } from "zod";
import { getEmbedder } from "@/lib/ai";
import { toVectorLiteral } from "@/lib/ai/embeddings";
import {
  EVIDENCE_MIN_SIMILARITY,
  toQuote,
  type Evidence,
} from "@/lib/domain/evidence";
import { PAGE_SIZE, parseFilters } from "@/lib/domain/filters";
import { RELEVANCE_CANDIDATES, orderByRelevance } from "@/lib/domain/relevance";
import { searchRestaurants, type SearchPage } from "@/lib/restaurants/search";
import {
  createUserServerSupabase,
  getVerifiedUserId,
} from "@/lib/supabase/server";

export type RelevancePage = SearchPage & {
  /** "distance" when relevance ordering could not be applied. */
  ordering: "relevance" | "distance";
  reason?: "login_required" | "unavailable";
  /** Only the nearest RELEVANCE_CANDIDATES results were re-ranked. */
  capped: boolean;
  /**
   * Per restaurant id on this page: a verbatim approved-review excerpt
   * supporting the preference (WP-05c). Missing id = no evidence.
   */
  evidence?: Record<string, Evidence>;
};

const boundsSchema = z.object({
  minLat: z.number().min(-90).max(90),
  minLng: z.number().min(-180).max(180),
  maxLat: z.number().min(-90).max(90),
  maxLng: z.number().min(-180).max(180),
});

// Query vectors are reused across pages and re-renders of the same search.
const queryVectors = new Map<string, string>();
const MAX_CACHED = 200;

async function queryVector(text: string): Promise<{
  model: string;
  literal: string;
} | null> {
  const embedder = getEmbedder();
  if (!embedder) return null;
  const key = `${embedder.model}\n${text}`;
  let literal = queryVectors.get(key);
  if (!literal) {
    const { vectors } = await embedder.embed(
      [text],
      "query",
      AbortSignal.timeout(3000),
    );
    literal = toVectorLiteral(vectors[0]);
    if (queryVectors.size >= MAX_CACHED) {
      queryVectors.delete(queryVectors.keys().next().value!);
    }
    queryVectors.set(key, literal);
  }
  return { model: embedder.model, literal };
}

/**
 * AI search results ordered by relevance (decision Q47): hard filters run
 * first exactly as in ordinary search, then the nearest candidates that
 * passed are re-ranked. Falls back to distance order, never to fewer
 * filters.
 */
export async function searchByRelevance(
  params: string,
  rawBounds: unknown,
  rawOffset: unknown,
): Promise<RelevancePage> {
  const filters = parseFilters(new URLSearchParams(String(params)));
  const bounds = boundsSchema.parse(rawBounds);
  const offset = z.number().int().min(0).max(1000).parse(rawOffset);

  const supabase = await createUserServerSupabase();
  const signedIn = Boolean(await getVerifiedUserId(supabase));

  const distancePage = async (
    reason: RelevancePage["reason"],
  ): Promise<RelevancePage> => ({
    ...(await searchRestaurants(supabase, filters, bounds, offset)),
    ordering: "distance",
    reason,
    capped: false,
  });

  if (!filters.semantic) return distancePage(undefined);
  if (!signedIn) return distancePage("login_required");

  let vector: Awaited<ReturnType<typeof queryVector>>;
  try {
    vector = await queryVector(filters.semantic);
  } catch (error) {
    console.error("query embedding failed", (error as Error).message);
    vector = null;
  }
  if (!vector) return distancePage("unavailable");

  const candidates = await searchRestaurants(
    supabase,
    filters,
    bounds,
    0,
    RELEVANCE_CANDIDATES,
  );
  const { data: ranks, error } = await supabase.rpc("rank_restaurants", {
    candidate_ids: candidates.items.map((item) => item.id),
    query_embedding: vector.literal,
    model: vector.model,
    semantic_text: filters.semantic,
  });
  if (error) {
    console.error("rank_restaurants failed", error.code);
    return distancePage("unavailable");
  }

  const ordered = orderByRelevance(candidates.items, ranks);
  const total = Math.min(candidates.total, RELEVANCE_CANDIDATES);
  const items = ordered.slice(offset, offset + PAGE_SIZE);
  return {
    items,
    total,
    excludedNoPrice: candidates.excludedNoPrice,
    ordering: "relevance",
    capped: candidates.total > RELEVANCE_CANDIDATES,
    evidence: await findEvidence(
      supabase,
      items.map((item) => item.id),
      vector,
    ),
  };
}

/** Evidence is optional: any failure just shows "no evidence". */
async function findEvidence(
  supabase: Awaited<ReturnType<typeof createUserServerSupabase>>,
  restaurantIds: string[],
  vector: { model: string; literal: string },
): Promise<Record<string, Evidence>> {
  const threshold = EVIDENCE_MIN_SIMILARITY[vector.model];
  if (threshold === undefined || restaurantIds.length === 0) return {};
  const { data, error } = await supabase.rpc("restaurant_evidence", {
    restaurant_ids: restaurantIds,
    query_embedding: vector.literal,
    model: vector.model,
    min_similarity: threshold,
  });
  if (error) {
    console.error("restaurant_evidence failed", error.code);
    return {};
  }
  return Object.fromEntries(
    data.map((row) => [
      row.restaurant_id,
      {
        reviewId: row.review_id,
        quote: toQuote(row.body),
        visitedAt: row.visited_at,
      },
    ]),
  );
}
