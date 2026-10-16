// Evidence evaluation (WP-05c gate, decision Q55).

export type EvidenceSample = {
  queryId: string;
  /** 0-based position in the fused ranking. */
  rank: number;
  /** Restaurant relevance grade for the query (0 = not relevant). */
  grade: number;
  /** Review indexes labeled as supporting the query. */
  supporting: number[];
  /** Best review returned by restaurant_evidence (null = none). */
  reviewIndex: number | null;
  similarity: number | null;
  /** The returned text equals the stored corpus review. */
  verbatim: boolean;
};

export type EvidenceScores = {
  threshold: number;
  /** Top-3 grade-2 results whose shown quote is a labeled supporting review. */
  supportRate: number;
  /** Non-relevant top-10 results that still show a quote. */
  falseEvidenceRate: number;
};

export const EVIDENCE_THRESHOLDS = {
  supportRate: 0.8,
  verbatimRate: 1,
} as const;

export function scoreEvidence(
  samples: EvidenceSample[],
  threshold: number,
): EvidenceScores {
  const shown = (s: EvidenceSample) =>
    s.reviewIndex !== null &&
    s.similarity !== null &&
    s.similarity >= threshold;
  const strong = samples.filter((s) => s.rank < 3 && s.grade === 2);
  const unrelated = samples.filter((s) => s.grade === 0);
  return {
    threshold,
    supportRate:
      strong.length === 0
        ? 1
        : strong.filter(
            (s) => shown(s) && s.supporting.includes(s.reviewIndex!),
          ).length / strong.length,
    falseEvidenceRate:
      unrelated.length === 0
        ? 0
        : unrelated.filter(shown).length / unrelated.length,
  };
}

/**
 * Highest threshold that still meets the support target, i.e. the one that
 * hides the most unrelated quotes. Null when no threshold meets it.
 */
export function calibrateThreshold(
  samples: EvidenceSample[],
  candidates: number[],
): EvidenceScores | null {
  const passing = candidates
    .map((t) => scoreEvidence(samples, t))
    .filter((s) => s.supportRate >= EVIDENCE_THRESHOLDS.supportRate);
  return passing.at(-1) ?? null;
}
