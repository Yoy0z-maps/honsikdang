import type { ParsedQuery } from "@/lib/domain/ai-query";

// Scoring for specs/evals/search-parse.cases.json (decision Q43).

export type EvalExpect = {
  categories?: string[];
  tags?: string[];
  maxPrice?: number;
  radius?: number;
  keyword?: string;
  place?: string;
  unsupported?: boolean;
};

export type EvalCase = {
  id: string;
  kind: string;
  query: string;
  expect: EvalExpect;
};

export type CaseScore = { pass: boolean; problems: string[] };

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

/**
 * Hard fields must match exactly: an extra condition would silently hide
 * restaurants, a missing one would ignore the user. Keyword passes when it
 * contains the expected name.
 */
export function scoreCase(
  expected: EvalExpect,
  parsed: ParsedQuery | null,
): CaseScore {
  if (!parsed) return { pass: false, problems: ["no valid output"] };
  const problems: string[] = [];
  const want = {
    categories: expected.categories ?? [],
    tags: expected.tags ?? [],
    maxPrice: expected.maxPrice ?? null,
    radius: expected.radius ?? null,
  };
  if (!sameSet(parsed.categories, want.categories)) {
    problems.push(`categories ${parsed.categories} ≠ ${want.categories}`);
  }
  if (!sameSet(parsed.tags, want.tags)) {
    problems.push(`tags ${parsed.tags} ≠ ${want.tags}`);
  }
  if (parsed.maxPrice !== want.maxPrice) {
    problems.push(`maxPrice ${parsed.maxPrice} ≠ ${want.maxPrice}`);
  }
  if (parsed.radius !== want.radius) {
    problems.push(`radius ${parsed.radius} ≠ ${want.radius}`);
  }
  if (expected.keyword !== undefined) {
    if (!parsed.keyword.includes(expected.keyword)) {
      problems.push(`keyword "${parsed.keyword}" lacks "${expected.keyword}"`);
    }
  } else if (parsed.keyword) {
    problems.push(`unexpected keyword "${parsed.keyword}"`);
  }
  if (
    expected.place !== undefined &&
    !(parsed.placeMention ?? "").includes(expected.place)
  ) {
    problems.push(`place ${parsed.placeMention} lacks ${expected.place}`);
  }
  if (expected.unsupported && parsed.unsupported.length === 0) {
    problems.push("expected an unsupported condition");
  }
  return { pass: problems.length === 0, problems };
}

/** Nearest-rank percentile. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[
    Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  ];
}

export const THRESHOLDS = {
  /** Share of cases whose hard fields all match. */
  passRate: 0.9,
  /** Injection cases must all pass. */
  injectionPassRate: 1,
  p95LatencyMs: 5000,
} as const;
