import Link from "next/link";
import { DirectionsButton } from "@/features/directions/DirectionsButton";
import { formatDate, formatPrice } from "@/lib/domain/format";
import type { RestaurantSummary } from "@/lib/restaurants/search";
import {
  distanceText,
  type DistanceOrigin,
} from "@/features/restaurants/RestaurantCard";

/** Compact card shown above the collapsed sheet when a marker is tapped. */
export function RestaurantPreview({
  restaurant: r,
  distanceOrigin,
  onClose,
}: {
  restaurant: RestaurantSummary;
  distanceOrigin: DistanceOrigin;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="preview-title"
      data-testid="restaurant-preview"
      className="pointer-events-auto rounded-2xl bg-white p-4 shadow-xl dark:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="preview-title" className="truncate text-lg font-semibold">
            {r.name}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {r.category.label} · {distanceText(r.distanceM, distanceOrigin)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="미리보기 닫기"
          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl"
        >
          ×
        </button>
      </div>
      <p className="mt-2 text-sm">
        {r.reviewCount > 0 ? (
          <>
            혼밥 리뷰 {r.reviewCount}개
            {r.lastVisitedAt && ` · 최근 방문 ${formatDate(r.lastVisitedAt)}`}
            {r.medianPrice !== null &&
              ` · 1인 약 ${formatPrice(r.medianPrice)}`}
          </>
        ) : (
          <span className="text-zinc-500">아직 승인된 혼밥 리뷰가 없어요.</span>
        )}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <DirectionsButton
          destination={{ ...r.position, name: r.name }}
          address={r.address}
          className="flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-700"
        />
        <Link
          href={`/restaurants/${r.id}`}
          className="flex min-h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          상세 보기
        </Link>
      </div>
    </div>
  );
}
