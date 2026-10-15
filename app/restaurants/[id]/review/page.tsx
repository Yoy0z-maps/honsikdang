import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { createReview } from "@/app/reviews/actions";
import { ReviewForm } from "@/features/reviews/ReviewForm";
import { loginPath } from "@/lib/auth/redirect";
import { todayInKorea } from "@/lib/domain/review";
import { fetchMyReviews } from "@/lib/reviews/mine";
import {
  createUserServerSupabase,
  getVerifiedUserId,
} from "@/lib/supabase/server";

async function NewReviewContent({
  params,
}: {
  params: PageProps<"/restaurants/[id]/review">["params"];
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createUserServerSupabase();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) redirect(loginPath(`/restaurants/${id}/review`));

  // RLS: approved restaurants, or the user's own pending proposal.
  const [{ data: restaurant }, { data: tags }, mine] = await Promise.all([
    supabase.from("restaurants").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("tags").select("slug, label").order("id"),
    fetchMyReviews(supabase),
  ]);
  if (!restaurant) notFound();

  const existing = mine.find((r) => r.restaurant_id === id);
  if (existing) redirect(`/me/reviews/${existing.id}/edit`);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">{restaurant.name}</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        혼밥 경험을 30초 만에 남겨 주세요.
      </p>
      <ReviewForm
        action={createReview.bind(null, id)}
        tags={tags ?? []}
        today={todayInKorea()}
        submitLabel="리뷰 등록"
      />
    </>
  );
}

export default function NewReviewPage({
  params,
}: PageProps<"/restaurants/[id]/review">) {
  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 py-6">
      <Link href="/" className="text-sm underline underline-offset-2">
        ← 혼식당
      </Link>
      <Suspense
        fallback={<p className="text-sm text-zinc-500">불러오는 중이에요…</p>}
      >
        <NewReviewContent params={params} />
      </Suspense>
    </main>
  );
}
