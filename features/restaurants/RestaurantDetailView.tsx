import Link from "next/link";
import type { ReactNode } from "react";
import { AccountMenu } from "@/features/auth/AccountMenu";
import { DirectionsButton } from "@/features/directions/DirectionsButton";
import { ReportButton } from "@/features/reports/ReportButton";
import { SEAT_TYPE_LABELS, formatDate, formatPrice } from "@/lib/domain/format";
import type {
  RestaurantDetail,
  RestaurantReview,
} from "@/lib/restaurants/detail";

const SOURCE_LABELS: Record<RestaurantDetail["source_type"], string> = {
  admin_entered: "운영자 등록",
  user_submitted: "사용자 제보 (검수 완료)",
};

function soloOrderLabel(value: boolean | null): string {
  if (value === null) return "응답 없음";
  return value ? "1인 주문 가능" : "1인 주문 불가";
}

function Review({
  review,
  returnTo,
}: {
  review: RestaurantReview;
  returnTo: string;
}) {
  const edited = review.updated_at !== review.created_at;
  return (
    <article className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <p className="font-medium">방문 {formatDate(review.visited_at)}</p>
        <p className="text-zinc-500">
          작성 {formatDate(review.created_at)}
          {edited && " (수정됨)"}
        </p>
      </header>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        <dt className="text-zinc-500">혼밥 편안함</dt>
        <dd>{review.solo_comfort}/5</dd>
        <dt className="text-zinc-500">좌석</dt>
        <dd>{SEAT_TYPE_LABELS[review.seat_type] ?? review.seat_type}</dd>
        <dt className="text-zinc-500">주문</dt>
        <dd>{soloOrderLabel(review.solo_order_available)}</dd>
        {review.price_paid !== null && (
          <>
            <dt className="text-zinc-500">1인 지출</dt>
            <dd>{formatPrice(review.price_paid)}</dd>
          </>
        )}
        {review.wait_minutes !== null && (
          <>
            <dt className="text-zinc-500">대기</dt>
            <dd>{review.wait_minutes}분</dd>
          </>
        )}
      </dl>
      {review.tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1" aria-label="특성">
          {review.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
      {review.body && (
        <p className="mt-2 whitespace-pre-line text-sm">{review.body}</p>
      )}
      <ReportButton
        targetType="review"
        targetId={review.id}
        returnTo={returnTo}
        label={`방문일 ${formatDate(review.visited_at)} 리뷰 신고`}
      />
    </article>
  );
}

const ACTION_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900";

export function RestaurantDetailView({
  detail,
  saveSlot,
}: {
  detail: RestaurantDetail;
  /** Save button; streamed separately because it depends on the session. */
  saveSlot: ReactNode;
}) {
  const s = detail.summary;
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="-ml-2 inline-flex min-h-11 items-center px-2 text-sm underline underline-offset-2"
          >
            ← 목록으로
          </Link>
          <AccountMenu />
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {detail.name}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {detail.category.label} · {detail.address}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          정보 출처: {SOURCE_LABELS[detail.source_type]} · 정보 업데이트{" "}
          {formatDate(detail.updated_at)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <DirectionsButton
            destination={{
              lat: detail.lat,
              lng: detail.lng,
              name: detail.name,
            }}
            address={detail.address}
            className={ACTION_CLASS}
          />
          {saveSlot}
        </div>
        <ReportButton
          targetType="restaurant"
          targetId={detail.id}
          returnTo={`/restaurants/${detail.id}`}
          label="이 식당 정보 신고"
        />
      </div>

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="text-lg font-semibold">
          혼밥 요약
        </h2>
        {s.review_count === 0 ? (
          <p className="mt-1 text-sm text-zinc-500">
            아직 승인된 혼밥 리뷰가 없어요.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-zinc-500">
              승인된 리뷰 {s.review_count}개 기준이며, 개인의 주관적인
              경험이에요.
            </p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {s.avg_solo_comfort !== null && (
                <>
                  <dt className="text-zinc-500">평균 혼밥 편안함</dt>
                  <dd>{s.avg_solo_comfort.toFixed(1)}/5</dd>
                </>
              )}
              <dt className="text-zinc-500">1인 지출</dt>
              <dd>
                {s.median_price !== null
                  ? `약 ${formatPrice(s.median_price)} (중앙값, 응답 ${s.price_sample_count}개)`
                  : "정보 없음"}
              </dd>
              <dt className="text-zinc-500">대기 시간</dt>
              <dd>
                {s.median_wait_minutes !== null
                  ? `약 ${s.median_wait_minutes}분 (중앙값, 응답 ${s.wait_sample_count}개)`
                  : "정보 없음"}
              </dd>
              <dt className="text-zinc-500">1인 주문</dt>
              <dd>
                가능 {s.solo_order_yes} · 불가 {s.solo_order_no}
              </dd>
              {s.last_visited_at && (
                <>
                  <dt className="text-zinc-500">최근 방문</dt>
                  <dd>{formatDate(s.last_visited_at)}</dd>
                </>
              )}
            </dl>
            {detail.tags.length > 0 && (
              <ul
                className="mt-3 flex flex-wrap gap-1"
                aria-label="자주 언급된 특성"
              >
                {detail.tags.map((tag) => (
                  <li
                    key={tag.slug}
                    className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs dark:border-zinc-700"
                  >
                    {tag.label} · {tag.review_count}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="reviews-heading">
        <div className="flex items-center justify-between gap-2">
          <h2 id="reviews-heading" className="text-lg font-semibold">
            방문 리뷰
          </h2>
          <Link
            href={`/restaurants/${detail.id}/review`}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            리뷰 쓰기
          </Link>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          리뷰는 방문 당시의 경험이라 지금과 다를 수 있어요.
        </p>
        {detail.reviews.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">리뷰가 없어요.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {detail.reviews.map((review) => (
              <li key={review.id}>
                <Review
                  review={review}
                  returnTo={`/restaurants/${detail.id}`}
                />
              </li>
            ))}
          </ul>
        )}
        {s.review_count > detail.reviews.length && (
          <p className="mt-2 text-xs text-zinc-500">
            최근 {detail.reviews.length}개만 표시했어요.
          </p>
        )}
      </section>
    </div>
  );
}
