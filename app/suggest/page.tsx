import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SuggestForm } from "@/features/places/SuggestForm";
import { loginPath } from "@/lib/auth/redirect";
import { parseFilters } from "@/lib/domain/filters";
import {
  createUserServerSupabase,
  getVerifiedUserId,
} from "@/lib/supabase/server";

async function SuggestContent({
  searchParams,
}: {
  searchParams: PageProps<"/suggest">["searchParams"];
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["lat", "lng", "z"]) {
    const value = raw[key];
    if (typeof value === "string") params.set(key, value);
  }
  // Start where the user was looking (falls back to the default center).
  const { center, zoom } = parseFilters(params);

  const supabase = await createUserServerSupabase();
  if (!(await getVerifiedUserId(supabase))) {
    // Always keep the position explicit: it is the point of this page.
    const query = new URLSearchParams({
      lat: center.lat.toFixed(5),
      lng: center.lng.toFixed(5),
      z: String(zoom),
    }).toString();
    redirect(loginPath(`/suggest?${query}`));
  }

  const { data: categories } = await supabase
    .from("restaurant_categories")
    .select("slug, label")
    .order("sort_order");

  return (
    <SuggestForm
      initial={{ center, zoom: Math.max(zoom, 17) }}
      categories={categories ?? []}
    />
  );
}

export default function SuggestPage({ searchParams }: PageProps<"/suggest">) {
  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm underline underline-offset-2"
      >
        ← 지도
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">장소 제안</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        지도에 없는 혼밥 식당을 알려 주세요.
      </p>
      <Suspense
        fallback={<p className="text-sm text-zinc-500">불러오는 중이에요…</p>}
      >
        <SuggestContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
