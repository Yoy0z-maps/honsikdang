// Relevance ordering for AI search (WP-05b, decision Q47). The candidates
// are the hard-filtered search results; ranking only re-orders them.

/** Candidates re-ranked per search: the nearest results that pass filters. */
export const RELEVANCE_CANDIDATES = 50;

export type RankRow = { id: string; score: number };

/**
 * Orders items by score (desc). Ties and unranked items keep their
 * original (distance) order; nothing is dropped or added.
 */
export function orderByRelevance<T extends { id: string }>(
  items: T[],
  ranks: RankRow[],
): T[] {
  const score = new Map(ranks.map((r) => [r.id, r.score]));
  return items
    .map((item, index) => ({ item, index, s: score.get(item.id) ?? 0 }))
    .sort((a, b) => b.s - a.s || a.index - b.index)
    .map(({ item }) => item);
}
