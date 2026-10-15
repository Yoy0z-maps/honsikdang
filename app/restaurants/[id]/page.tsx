import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { SAVE_BUTTON_CLASS, SaveButton } from "@/features/saved/SaveButton";
import { RestaurantDetailView } from "@/features/restaurants/RestaurantDetailView";
import { fetchRestaurantDetail } from "@/lib/restaurants/detail";
import { getPublicServerSupabase } from "@/lib/supabase/server";

async function RestaurantDetailContent({
  params,
}: {
  params: PageProps<"/restaurants/[id]">["params"];
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  // Uncached on purpose: moderation changes must show up immediately.
  const detail = await fetchRestaurantDetail(getPublicServerSupabase(), id);
  if (!detail) notFound();

  return (
    <RestaurantDetailView
      detail={detail}
      saveSlot={
        <Suspense
          fallback={
            <span aria-hidden className={`${SAVE_BUTTON_CLASS} w-20`} />
          }
        >
          <SaveButton restaurantId={detail.id} />
        </Suspense>
      }
    />
  );
}

export default function RestaurantPage({
  params,
}: PageProps<"/restaurants/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <Suspense
        fallback={
          <p aria-busy="true" className="text-sm text-zinc-500">
            식당 정보를 불러오는 중이에요…
          </p>
        }
      >
        <RestaurantDetailContent params={params} />
      </Suspense>
    </main>
  );
}
