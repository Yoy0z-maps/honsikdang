import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountMenu } from "@/features/auth/AccountMenu";
import { DeleteReviewButton } from "@/features/reviews/DeleteReviewButton";
import { loginPath } from "@/lib/auth/redirect";
import { formatDate } from "@/lib/domain/format";
import { REVIEW_STATUS_LABELS, fetchMyReviews } from "@/lib/reviews/mine";
import {
  createUserServerSupabase,
  getVerifiedUserId,
} from "@/lib/supabase/server";

const SAVED_MESSAGES: Record<string, string> = {
  created: "리뷰를 등록했어요. 검수 후 공개돼요.",
  updated: "리뷰를 수정했어요. 다시 검수 후 공개돼요.",
  deleted: "리뷰를 삭제했어요.",
  "delete-failed": "리뷰를 삭제하지 못했어요.",
};

async function MyReviewsContent({
  searchParams,
}: {
  searchParams: PageProps<"/me/reviews">["searchParams"];
}) {
  const supabase = await createUserServerSupabase();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) redirect(loginPath("/me/reviews"));

  const [reviews, params] = await Promise.all([
    fetchMyReviews(supabase),
    searchParams,
  ]);
  const saved =
    typeof params.saved === "string" ? SAVED_MESSAGES[params.saved] : undefined;

  return (
    <>
      {saved && (
        <p
          role="status"
          className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800"
        >
          {saved}
        </p>
      )}
      {reviews.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          아직 쓴 리뷰가 없어요. 식당 상세에서 리뷰를 남겨 보세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">
                  {review.restaurant_status === "approved" ? (
                    <Link
                      href={`/restaurants/${review.restaurant_id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {review.restaurant_name}
                    </Link>
                  ) : (
                    review.restaurant_name
                  )}
                </h2>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                  {REVIEW_STATUS_LABELS[review.status]}
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                방문 {formatDate(review.visited_at)} · 혼밥 편안함{" "}
                {review.solo_comfort}/5
              </p>
              {review.status !== "removed" && (
                <div className="mt-2 flex gap-4">
                  <Link
                    href={`/me/reviews/${review.id}/edit`}
                    aria-label={`${review.restaurant_name} 리뷰 수정`}
                    className="text-sm underline underline-offset-2"
                  >
                    수정
                  </Link>
                  <DeleteReviewButton
                    reviewId={review.id}
                    restaurantName={review.restaurant_name}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function MyReviewsPage({
  searchParams,
}: PageProps<"/me/reviews">) {
  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <nav className="flex gap-4 text-sm">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center underline underline-offset-2"
          >
            ← 지도
          </Link>
          <Link
            href="/me/places"
            className="inline-flex min-h-11 items-center underline underline-offset-2"
          >
            내 장소 제안
          </Link>
        </nav>
        <AccountMenu />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">내 리뷰</h1>
      <Suspense
        fallback={<p className="text-sm text-zinc-500">불러오는 중이에요…</p>}
      >
        <MyReviewsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
