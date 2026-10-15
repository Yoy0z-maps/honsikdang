import Link from "next/link";
import { loginPath } from "@/lib/auth/redirect";
import {
  createUserServerSupabase,
  getVerifiedUserId,
} from "@/lib/supabase/server";
import { SaveToggle } from "./SaveToggle";

export const SAVE_BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-zinc-300 px-4 text-sm font-medium disabled:opacity-60 dark:border-zinc-700";

/** Signed-out users get a login link that returns to the detail page. */
export async function SaveButton({ restaurantId }: { restaurantId: string }) {
  const returnTo = `/restaurants/${restaurantId}`;
  const supabase = await createUserServerSupabase();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    return (
      <Link href={loginPath(returnTo)} className={SAVE_BUTTON_CLASS}>
        <span aria-hidden>☆</span>저장
      </Link>
    );
  }
  const { data, error } = await supabase
    .from("favorites")
    .select("restaurant_id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (error) throw new Error(`favorite lookup failed: ${error.code}`);
  return (
    <SaveToggle
      restaurantId={restaurantId}
      initialSaved={data !== null}
      returnTo={returnTo}
      className={SAVE_BUTTON_CLASS}
    />
  );
}
