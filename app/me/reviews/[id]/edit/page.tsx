import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { updateReview } from "@/app/reviews/actions";
import { ReviewForm } from "@/features/reviews/ReviewForm";
import { loginPath } from "@/lib/auth/redirect";
import { todayInKorea } from "@/lib/domain/review";
import {
  REVIEW_STATUS_LABELS,
  fetchMyReviews,
  toFormValues,
} from "@/lib/reviews/mine";
import {
  createUserServerSupabase,
  getVerifiedUserId,
} from "@/lib/supabase/server";

async function EditReviewContent({
  params,
}: {
  params: PageProps<"/me/reviews/[id]/edit">["params"];
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createUserServerSupabase();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) redirect(loginPath(`/me/reviews/${id}/edit`));

  const [[review], { data: tags }] = await Promise.all([
    fetchMyReviews(supabase, id),
    supabase.from("tags").select("slug, label").order("id"),
  ]);
  if (!review) notFound();

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">
        {review.restaurant_name} 리뷰 수정
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        현재 상태: {REVIEW_STATUS_LABELS[review.status]}
      </p>
      {review.status === "removed" ? (
        <p role="status" className="text-sm">
          운영자가 비공개 처리한 리뷰는 수정하거나 삭제할 수 없어요.
        </p>
      ) : (
        <ReviewForm
          action={updateReview.bind(null, id)}
          tags={tags ?? []}
          today={todayInKorea()}
          defaults={toFormValues(review)}
          submitLabel="수정 저장"
        />
      )}
    </>
  );
}

export default function EditReviewPage({
  params,
}: PageProps<"/me/reviews/[id]/edit">) {
  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 py-6">
      <Link href="/me/reviews" className="text-sm underline underline-offset-2">
        ← 내 리뷰
      </Link>
      <Suspense
        fallback={<p className="text-sm text-zinc-500">불러오는 중이에요…</p>}
      >
        <EditReviewContent params={params} />
      </Suspense>
    </main>
  );
}
