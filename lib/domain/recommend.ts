// "오늘 뭐 먹지?" — deterministic recommender V1 (WP-06, decisions Q56–Q62).
// Pure functions: same input → same output. No model, no stored feedback.
// Reasons are built only from stored aggregates; nothing is invented.

import { formatDate, formatDistance, formatPrice } from "./format";

export type Mood = "quiet" | "quick" | "solo";

/** Mood chips map to existing review tags (Q57). */
export const MOOD_TAGS: Record<Mood, string> = {
  quiet: "quiet",
  quick: "quick_turnover",
  solo: "solo_seat",
};

export const MOOD_LABELS: Record<Mood, string> = {
  quiet: "조용히",
  quick: "빨리",
  solo: "혼자 편하게",
};

export type RecommendInput = {
  /** Upper bound per person; enforced only where a price is known (Q58). */
  budget: number | null;
  /** Empty = any category. */
  include: string[];
  exclude: string[];
  moods: Mood[];
};

export type Candidate = {
  id: string;
  name: string;
  categorySlug: string;
  categoryLabel: string;
  position: { lat: number; lng: number };
  distanceM: number;
  reviewCount: number;
  avgSoloComfort: number | null;
  medianPrice: number | null;
  lastVisitedAt: string | null;
  /** Moods whose tag appears in at least one approved review. */
  moodsMatched: Mood[];
};

export type Pick = {
  candidate: Candidate;
  score: number;
  /** Grounded, human-readable reasons in display order. */
  reasons: string[];
  badges: ("new" | "no_price")[];
};

export type Recommendation = {
  picks: Pick[];
  eligibleCount: number;
  excludedByBudget: number;
  excludedByCategory: number;
  /** Set when fewer than 3 picks: why (Q62 "fewer with explanation"). */
  shortfall: string | null;
};

// Transparent weights (Q59).
export const WEIGHTS = {
  comfort: 0.4,
  distance: 0.25,
  recency: 0.15,
  match: 0.2,
};
const COMFORT_PRIOR = 3.5;
const COMFORT_PRIOR_WEIGHT = 3;
const RECENCY_HALF_LIFE_DAYS = 60;
export const PICK_COUNT = 3;

/** Average pulled toward 3.5 when there are few reviews (Q59). */
export function shrunkComfort(avg: number | null, n: number): number {
  const sum = avg === null ? 0 : avg * n;
  const count = avg === null ? 0 : n;
  return (
    (sum + COMFORT_PRIOR * COMFORT_PRIOR_WEIGHT) /
    (count + COMFORT_PRIOR_WEIGHT)
  );
}

function daysBetween(isoDate: string, today: string): number {
  return Math.max(0, (Date.parse(today) - Date.parse(isoDate)) / 86_400_000);
}

export function scoreCandidate(
  c: Candidate,
  input: RecommendInput,
  maxDistance: number,
  today: string,
): number {
  const comfort = (shrunkComfort(c.avgSoloComfort, c.reviewCount) - 1) / 4;
  const distance =
    maxDistance > 0 ? 1 - Math.min(c.distanceM / maxDistance, 1) : 1;
  const recency = c.lastVisitedAt
    ? 0.5 ** (daysBetween(c.lastVisitedAt, today) / RECENCY_HALF_LIFE_DAYS)
    : 0;
  const match =
    input.moods.length === 0 ? 0 : c.moodsMatched.length / input.moods.length;
  return (
    WEIGHTS.comfort * comfort +
    WEIGHTS.distance * distance +
    WEIGHTS.recency * recency +
    WEIGHTS.match * match
  );
}

export function reasonsFor(c: Candidate, input: RecommendInput): string[] {
  const reasons: string[] = [];
  if (c.avgSoloComfort !== null && c.reviewCount > 0) {
    reasons.push(
      `혼밥 편안함 ${c.avgSoloComfort.toFixed(1)}/5 (리뷰 ${c.reviewCount}개)`,
    );
  } else {
    reasons.push("아직 승인된 리뷰가 없어요");
  }
  for (const mood of c.moodsMatched) {
    reasons.push(`'${MOOD_LABELS[mood]}' 관련 특성이 리뷰에 있어요`);
  }
  if (c.medianPrice !== null) {
    reasons.push(`1인 약 ${formatPrice(c.medianPrice)} (중앙값)`);
  } else if (input.budget !== null) {
    reasons.push("가격 정보가 없어 예산을 확인하지 못했어요");
  }
  if (c.lastVisitedAt) reasons.push(`최근 방문 ${formatDate(c.lastVisitedAt)}`);
  reasons.push(`지도 중심에서 ${formatDistance(c.distanceM)}`);
  return reasons;
}

/**
 * Picks up to 3 (Q60): best score first, different categories when
 * possible, at most one place without reviews and at most one without a
 * price. `seen` ids (earlier rounds of "다른 추천 보기") are skipped.
 */
export function recommend(
  candidates: Candidate[],
  input: RecommendInput,
  today: string,
  seen: ReadonlySet<string> = new Set(),
): Recommendation {
  let excludedByBudget = 0;
  let excludedByCategory = 0;
  const eligible = candidates.filter((c) => {
    if (input.exclude.includes(c.categorySlug)) {
      excludedByCategory++;
      return false;
    }
    if (input.include.length > 0 && !input.include.includes(c.categorySlug)) {
      excludedByCategory++;
      return false;
    }
    if (
      input.budget !== null &&
      c.medianPrice !== null &&
      c.medianPrice > input.budget
    ) {
      excludedByBudget++;
      return false;
    }
    return true;
  });

  const maxDistance = Math.max(0, ...eligible.map((c) => c.distanceM));
  const ranked = eligible
    .filter((c) => !seen.has(c.id))
    .map((c) => ({ c, s: scoreCandidate(c, input, maxDistance, today) }))
    .sort((a, b) => b.s - a.s || a.c.id.localeCompare(b.c.id));

  const picked: typeof ranked = [];
  const allowed = (c: Candidate, distinctCategory: boolean) =>
    !(
      distinctCategory &&
      picked.some((p) => p.c.categorySlug === c.categorySlug)
    ) &&
    !(c.reviewCount === 0 && picked.some((p) => p.c.reviewCount === 0)) &&
    !(
      input.budget !== null &&
      c.medianPrice === null &&
      picked.some((p) => p.c.medianPrice === null)
    );
  for (const distinct of [true, false]) {
    for (const entry of ranked) {
      if (picked.length >= PICK_COUNT) break;
      if (!picked.includes(entry) && allowed(entry.c, distinct))
        picked.push(entry);
    }
  }

  const picks: Pick[] = picked.map(({ c, s }) => ({
    candidate: c,
    score: s,
    reasons: reasonsFor(c, input),
    badges: [
      ...(c.reviewCount === 0 ? (["new"] as const) : []),
      ...(input.budget !== null && c.medianPrice === null
        ? (["no_price"] as const)
        : []),
    ],
  }));

  return {
    picks,
    eligibleCount: eligible.length,
    excludedByBudget,
    excludedByCategory,
    shortfall:
      picks.length < PICK_COUNT
        ? shortfallText(
            picks.length,
            eligible.length,
            seen.size,
            excludedByBudget,
            excludedByCategory,
          )
        : null,
  };
}

function shortfallText(
  picked: number,
  eligible: number,
  seen: number,
  byBudget: number,
  byCategory: number,
): string {
  const head =
    picked === 0
      ? "추천할 수 있는 식당이 없어요."
      : `조건에 맞는 식당이 ${picked}곳뿐이에요.`;
  const hints: string[] = [];
  if (seen > 0 && eligible > 0)
    hints.push("이미 본 추천은 다시 보여 주지 않아요");
  if (byBudget > 0) hints.push(`예산을 넘는 ${byBudget}곳을 뺐어요`);
  if (byCategory > 0) hints.push(`음식 종류 조건으로 ${byCategory}곳을 뺐어요`);
  hints.push("지도를 옮기거나 넓혀 보세요");
  return `${head} ${hints.join(" · ")}.`;
}
