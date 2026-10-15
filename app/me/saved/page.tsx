import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DirectionsButton } from "@/features/directions/DirectionsButton";
import { ActivityNav } from "@/features/me/ActivityNav";
import { SaveToggle } from "@/features/saved/SaveToggle";
import { loginPath } from "@/lib/auth/redirect";
import { formatDate } from "@/lib/domain/format";
import {
  createUserServerSupabase,
  getVerifiedUserId,
} from "@/lib/supabase/server";

const BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-zinc-300 px-3 text-sm font-medium disabled:opacity-60 dark:border-zinc-700";

async function SavedContent() {
  const supabase = await createUserServerSupabase();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) redirect(loginPath("/me/saved"));

  // Includes places archived after saving, without address/location (Q36).
  const { data, error } = await supabase.rpc("my_saved");
  if (error) throw new Error(`my saved failed: ${error.code}`);

  if (data.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        아직 저장한 식당이 없어요. 식당 상세에서 저장할 수 있어요.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {data.map((place) => {
        const open =
          place.status === "approved" &&
          place.address !== null &&
          place.lat !== null &&
          place.lng !== null;
        return (
          <li
            key={place.id}
            className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <h2 className="font-semibold">
              {open ? (
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
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {place.category_label}
              {open
                ? ` · ${place.address}`
                : " · 지금은 공개되지 않은 식당이에요"}
            </p>
            <p className="text-xs text-zinc-500">
              저장 {formatDate(place.saved_at)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {open && (
                <DirectionsButton
                  destination={{
                    lat: place.lat!,
                    lng: place.lng!,
                    name: place.name,
                  }}
                  address={place.address!}
                  className={BUTTON_CLASS}
                />
              )}
              <SaveToggle
                restaurantId={place.id}
                initialSaved
                returnTo="/me/saved"
                className={BUTTON_CLASS}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function MySavedPage() {
  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 py-6">
      <ActivityNav current="/me/saved" />
      <h1 className="text-2xl font-bold tracking-tight">저장한 식당</h1>
      <Suspense
        fallback={<p className="text-sm text-zinc-500">불러오는 중이에요…</p>}
      >
        <SavedContent />
      </Suspense>
    </main>
  );
}
