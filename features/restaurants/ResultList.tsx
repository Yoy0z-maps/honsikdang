import type { RestaurantSummary } from "@/lib/restaurants/search";
import { RestaurantCard } from "./RestaurantCard";

export type ResultState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      items: RestaurantSummary[];
      total: number;
      excludedNoPrice: number;
      loadingMore: boolean;
      loadMoreFailed: boolean;
    };

type Props = {
  state: ResultState;
  selectedId: string | null;
  hasActiveFilters: boolean;
  showTagCount: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  onResetFilters: () => void;
  onFocusItem: (id: string) => void;
};

export function ResultList({
  state,
  selectedId,
  hasActiveFilters,
  showTagCount,
  onRetry,
  onLoadMore,
  onResetFilters,
  onFocusItem,
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
            className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
          />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 p-4 text-sm"
      >
        <p>식당 목록을 불러오지 못했어요.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md bg-zinc-900 px-3 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const { items, total, excludedNoPrice, loadingMore, loadMoreFailed } = state;

  return (
    <section aria-labelledby="result-heading">
      <div aria-live="polite" className="mb-2 text-sm">
        <h2 id="result-heading" className="font-semibold">
          식당 {total}곳
        </h2>
        {excludedNoPrice > 0 && (
          <p className="text-zinc-600 dark:text-zinc-400">
            가격 정보가 없는 {excludedNoPrice}곳은 예산 필터에서 제외했어요.
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm dark:border-zinc-700">
          <p>조건에 맞는 식당이 없어요.</p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            검색 반경을 넓히거나 지도를 옮겨 보세요.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-2 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
            >
              필터 초기화
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <RestaurantCard
                restaurant={item}
                selected={item.id === selectedId}
                showTagCount={showTagCount}
                onFocus={() => onFocusItem(item.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {items.length < total && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
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
    </section>
  );
}
