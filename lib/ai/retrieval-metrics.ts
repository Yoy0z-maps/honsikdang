// Ranking metrics for specs/evals/retrieval.corpus.json (decision Q48).

export type Grades = Record<string, number>;

/** Share of relevant items (grade ≥ 1) found in the top k. */
export function recallAtK(ranked: string[], grades: Grades, k: number): number {
  const relevant = Object.keys(grades).filter((id) => grades[id] >= 1);
  if (relevant.length === 0) return 1;
  const top = new Set(ranked.slice(0, k));
  return relevant.filter((id) => top.has(id)).length / relevant.length;
}

/** NDCG@k with graded relevance (gain 2^g − 1, log2 discount). */
export function ndcgAtK(ranked: string[], grades: Grades, k: number): number {
  const dcg = (gains: number[]) =>
    gains
      .slice(0, k)
      .reduce((sum, g, i) => sum + (2 ** g - 1) / Math.log2(i + 2), 0);
  const ideal = dcg(Object.values(grades).sort((a, b) => b - a));
  if (ideal === 0) return 1;
  return dcg(ranked.map((id) => grades[id] ?? 0)) / ideal;
}

export const RETRIEVAL_THRESHOLDS = {
  k: 10,
  /** Mean recall@10 of the fused ranking. */
  recall: 0.8,
  /** Fused NDCG@10 must beat distance order by at least this much. */
  ndcgGainOverDistance: 0.1,
} as const;
