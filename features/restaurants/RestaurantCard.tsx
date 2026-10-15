import Link from "next/link";
import { formatDate, formatDistance, formatPrice } from "@/lib/domain/format";
import type { RestaurantSummary } from "@/lib/restaurants/search";

export type DistanceOrigin = "me" | "map";

export function distanceText(meters: number, origin: DistanceOrigin): string {
  return `${origin === "me" ? "내 위치에서" : "지도 중심에서"} ${formatDistance(meters)}`;
}

type Props = {
  restaurant: RestaurantSummary;
  selected: boolean;
  showTagCount: boolean;
  distanceOrigin: DistanceOrigin;
  onLocate?: () => void;
};

export function RestaurantCard({
  restaurant: r,
  selected,
  showTagCount,
  distanceOrigin,
  onLocate,
}: Props) {
  return (
    <article
      id={`restaurant-${r.id}`}
      className={`rounded-xl border p-3 transition-colors ${
        selected
          ? "border-orange-600 bg-orange-50 dark:bg-orange-950/30"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">
            <Link
              href={`/restaurants/${r.id}`}
              className="flex min-h-11 items-center underline-offset-2 hover:underline focus-visible:underline"
            >
              {r.name}
            </Link>
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {r.category.label} · {distanceText(r.distanceM, distanceOrigin)}
          </p>
        </div>
        {onLocate && (
          <button
            type="button"
            onClick={onLocate}
            aria-label={`${r.name} 지도에서 보기`}
            className="min-h-11 shrink-0 rounded-lg border border-zinc-300 px-3 text-sm dark:border-zinc-700"
          >
            지도
          </button>
        )}
      </div>
      {r.reviewCount > 0 ? (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          {r.avgSoloComfort !== null && (
            <>
              <dt className="text-zinc-500">혼밥 편안함</dt>
              <dd>
                {r.avgSoloComfort.toFixed(1)}/5{" "}
                <span className="text-zinc-500">(리뷰 {r.reviewCount}개)</span>
              </dd>
            </>
          )}
          <dt className="text-zinc-500">1인 지출</dt>
          <dd>
            {r.medianPrice !== null
              ? `약 ${formatPrice(r.medianPrice)} (중앙값)`
              : "정보 없음"}
          </dd>
          {r.lastVisitedAt && (
            <>
              <dt className="text-zinc-500">최근 방문</dt>
              <dd>{formatDate(r.lastVisitedAt)}</dd>
            </>
          )}
          {showTagCount && (
            <>
              <dt className="text-zinc-500">선택한 특성</dt>
              <dd>리뷰 {r.tagReviewCount}개에서 언급</dd>
            </>
          )}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">
          아직 승인된 혼밥 리뷰가 없어요.
        </p>
      )}
    </article>
  );
}
