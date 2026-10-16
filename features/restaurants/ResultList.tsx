import Link from "next/link";
import type { Evidence } from "@/lib/domain/evidence";
import type { RestaurantSummary } from "@/lib/restaurants/search";
import { RestaurantCard, type DistanceOrigin } from "./RestaurantCard";

export type ResultState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      items: RestaurantSummary[];
      total: number;
      excludedNoPrice: number;
      areaClamped: boolean;
      loadingMore: boolean;
      loadMoreFailed: boolean;
      /** AI search preference ordering (WP-05b); absent = distance order. */
      relevance?: RelevanceInfo;
    };

export type RelevanceInfo = {
  text: string;
  /** False when relevance ordering could not be applied. */
  applied: boolean;
  /** Only the nearest results were re-ranked. */
  capped: boolean;
  /** Verbatim review evidence per restaurant id (WP-05c). */
  evidence: Record<string, Evidence>;
};

type Props = {
  state: ResultState;
  selectedId: string | null;
  hasActiveFilters: boolean;
  showTagCount: boolean;
  distanceOrigin: DistanceOrigin;
  onRetry: () => void;
  onLoadMore: () => void;
  onResetFilters: () => void;
  onLocate: (id: string) => void;
  /** Offered on empty results (journey B: propose a missing place). */
  suggestHref?: string;
  onClearRelevance?: () => void;
};

const buttonClass =
  "min-h-11 rounded-lg border border-zinc-300 px-4 text-sm dark:border-zinc-700";

/** Result count / status line for the sheet header (announced politely). */
export function resultSummary(state: ResultState): string {
  if (state.status === "loading") return "식당을 찾는 중…";
  if (state.status === "error") return "목록을 불러오지 못했어요";
  return `식당 ${state.total}곳`;
}

export function ResultList({
  state,
  selectedId,
  hasActiveFilters,
  showTagCount,
  distanceOrigin,
  onRetry,
  onLoadMore,
  onResetFilters,
  onLocate,
  suggestHref,
  onClearRelevance,
}: Props) {
  if (state.status === "loading") {
    return (
      <div
        aria-busy="true"
        aria-label="식당 목록을 불러오는 중"
        className="space-y-2"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800"
          />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 p-4 text-sm"
      >
        <p>식당 목록을 불러오지 못했어요.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 min-h-11 rounded-lg bg-zinc-900 px-4 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const {
    items,
    total,
    excludedNoPrice,
    areaClamped,
    loadingMore,
    loadMoreFailed,
    relevance,
  } = state;

  return (
    <div className="space-y-2">
      {relevance && (
        <div
          data-testid="relevance-note"
          className="flex items-start justify-between gap-2 rounded-lg bg-orange-50 p-2 text-sm dark:bg-orange-950/40"
        >
          <p className="min-w-0">
            {relevance.applied ? (
              <>
                <span className="font-medium">관련도순</span> · &lsquo;
                {relevance.text}&rsquo;에 가까운 리뷰가 있는 곳부터 보여 줘요.
                {relevance.capped &&
                  " 조건에 맞는 가까운 50곳 안에서 골랐어요."}
              </>
            ) : (
              <>
                &lsquo;{relevance.text}&rsquo; 관련도순을 지금 쓸 수 없어
                거리순으로 보여 줘요.
              </>
            )}
          </p>
          {onClearRelevance && (
            <button
              type="button"
              onClick={onClearRelevance}
              className="min-h-11 shrink-0 px-1 underline underline-offset-2"
            >
              거리순
            </button>
          )}
        </div>
      )}
      {(excludedNoPrice > 0 || areaClamped) && (
        <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          {areaClamped && (
            <p>지도가 넓어서 화면 중앙 주변만 검색했어요. 확대해 주세요.</p>
          )}
          {excludedNoPrice > 0 && (
            <p>
              가격 정보가 없는 {excludedNoPrice}곳은 예산 필터에서 제외했어요.
            </p>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm dark:border-zinc-700">
          <p>조건에 맞는 식당이 없어요.</p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            지도를 옮기거나 축소한 뒤 &lsquo;이 지역에서 다시 검색&rsquo;을 눌러
            보세요.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className={buttonClass}
              >
                필터 초기화
              </button>
            )}
            {suggestHref && (
              <Link
                href={suggestHref}
                className={`inline-flex items-center ${buttonClass}`}
              >
                찾는 식당이 없나요? 장소 제안
              </Link>
            )}
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <RestaurantCard
                restaurant={item}
                selected={item.id === selectedId}
                showTagCount={showTagCount}
                distanceOrigin={distanceOrigin}
                onLocate={() => onLocate(item.id)}
                evidence={
                  relevance?.applied
                    ? (relevance.evidence[item.id] ?? null)
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}

      {items.length < total && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className={`w-full disabled:opacity-50 ${buttonClass}`}
          >
            {loadingMore
              ? "불러오는 중…"
              : `더 보기 (${items.length}/${total})`}
          </button>
          {loadMoreFailed && (
            <p role="alert" className="mt-1 text-sm text-red-700">
              더 불러오지 못했어요. 다시 시도해 주세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
