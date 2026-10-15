import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { loginPath } from "@/lib/auth/redirect";
import { formatDate } from "@/lib/domain/format";
import {
  createUserServerSupabase,
  getVerifiedUserId,
} from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  pending: "검수 대기",
  approved: "공개됨",
  rejected: "반려됨",
  archived: "보관됨",
};

async function MyPlacesContent() {
  const supabase = await createUserServerSupabase();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) redirect(loginPath("/me/places"));

  // RLS: the creator can read their own proposals in any status.
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      "id, name, address, status, created_at, restaurant_categories(label)",
    )
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`my places failed: ${error.code}`);

  if (data.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        아직 제안한 장소가 없어요.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {data.map((place) => (
        <li
          key={place.id}
          className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold">
              {place.status === "approved" ? (
                <Link
                  href={`/restaurants/${place.id}`}
                  className="underline-offset-2 hover:underline"
                >
                  {place.name}
                </Link>
              ) : (
                place.name
              )}
            </h2>
            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
              {STATUS_LABELS[place.status] ?? place.status}
            </span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {place.restaurant_categories?.label} · {place.address}
          </p>
          <p className="text-xs text-zinc-500">
            제안 {formatDate(place.created_at)}
          </p>
          {(place.status === "pending" || place.status === "approved") && (
            <Link
              href={`/restaurants/${place.id}/review`}
              className="mt-1 inline-flex min-h-11 items-center text-sm underline underline-offset-2"
            >
              리뷰 쓰기
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function MyPlacesPage() {
  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 py-6">
      <nav className="flex gap-4 text-sm">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center underline underline-offset-2"
        >
          ← 지도
        </Link>
        <Link
          href="/me/reviews"
          className="inline-flex min-h-11 items-center underline underline-offset-2"
        >
          내 리뷰
        </Link>
      </nav>
      <h1 className="text-2xl font-bold tracking-tight">내 장소 제안</h1>
      <Suspense
        fallback={<p className="text-sm text-zinc-500">불러오는 중이에요…</p>}
      >
        <MyPlacesContent />
      </Suspense>
    </main>
  );
}
