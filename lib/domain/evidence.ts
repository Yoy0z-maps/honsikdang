// Grounded evidence for AI search results (WP-05c, decisions Q50–Q52).
// Evidence is a verbatim excerpt of an approved review: never generated.

export type Evidence = {
  reviewId: string;
  /** Verbatim review text, shortened only by cutting the end ("…"). */
  quote: string;
  visitedAt: string;
};

export const QUOTE_MAX_LENGTH = 80;

/**
 * Cosine similarity a review must reach to be shown as evidence, per
 * embedding model (calibrated with npm run eval:retrieval). Models not
 * listed never show evidence.
 */
export const EVIDENCE_MIN_SIMILARITY: Record<string, number> = {
  "voyage-4": 0.5,
  "fixture-embed": 0.3,
};

/** Shortens a review to a quote; the result minus "…" is a prefix of it. */
export function toQuote(body: string): string {
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= QUOTE_MAX_LENGTH) return text;
  return `${text.slice(0, QUOTE_MAX_LENGTH - 1).trimEnd()}…`;
}

/** True when `quote` is a faithful excerpt of `body` (used by the gate). */
export function isVerbatimExcerpt(quote: string, body: string): boolean {
  const normalized = body.replace(/\s+/g, " ").trim();
  const core = quote.endsWith("…") ? quote.slice(0, -1) : quote;
  return core.length > 0 && normalized.startsWith(core);
}
