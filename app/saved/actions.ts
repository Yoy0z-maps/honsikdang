"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { loginPath } from "@/lib/auth/redirect";
import {
  createUserServerSupabase,
  getVerifiedUserId,
} from "@/lib/supabase/server";

export type SaveState = { saved: boolean; message?: string };

const saveSchema = z.object({
  restaurantId: z.string().uuid(),
  save: z.enum(["1", "0"]),
  returnTo: z.string().regex(/^\/(restaurants\/[0-9a-f-]{36}|me\/saved)$/),
});

/** Saves or unsaves a place; the returned state is the new truth. */
export async function setSaved(
  prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const parsed = saveSchema.safeParse({
    restaurantId: formData.get("restaurantId"),
    save: formData.get("save"),
    returnTo: formData.get("returnTo"),
  });
  if (!parsed.success) {
    return { saved: prev.saved, message: "요청을 처리하지 못했어요." };
  }
  const { restaurantId, save, returnTo } = parsed.data;

  const supabase = await createUserServerSupabase();
  if (!(await getVerifiedUserId(supabase))) redirect(loginPath(returnTo));

  if (save === "1") {
    // RLS: user_id defaults to the caller; only approved places (Q35).
    const { error } = await supabase
      .from("favorites")
      .insert({ restaurant_id: restaurantId });
    // 23505: already saved (e.g. another tab) — the goal state holds.
    if (error && error.code !== "23505") {
      console.error("favorite insert failed", error.code);
      return {
        saved: false,
        message:
          error.code === "42501"
            ? "공개된 식당만 저장할 수 있어요."
            : "저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      };
    }
    return { saved: true };
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("restaurant_id", restaurantId);
  if (error) {
    console.error("favorite delete failed", error.code);
    return {
      saved: true,
      message: "저장을 취소하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
  return { saved: false };
}
