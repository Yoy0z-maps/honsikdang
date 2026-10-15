import Link from "next/link";
import { formatDate, formatDistance, formatPrice } from "@/lib/domain/format";
import type { RestaurantSummary } from "@/lib/restaurants/search";

type Props = {
  restaurant: RestaurantSummary;
  selected: boolean;
  showTagCount: boolean;
  onFocus?: () => void;
};

export function RestaurantCard({
  restaurant: r,
  selected,
  showTagCount,
  onFocus,
}: Props) {
  return (
    <article
      id={`restaurant-${r.id}`}
      onMouseEnter={onFocus}
      onFocus={onFocus}
      className={`rounded-lg border p-3 transition-colors ${
        selected
          ? "border-orange-600 bg-orange-50 dark:bg-orange-950/30"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <h3 className="text-base font-semibold">
        <Link
          href={`/restaurants/${r.id}`}
          className="underline-offset-2 hover:underline focus-visible:underline"
        >
          {r.name}
        </Link>
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {r.category.label} · {formatDistance(r.distanceM)}
      </p>
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
