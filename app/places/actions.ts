"use server";

import { redirect } from "next/navigation";
import { loginPath } from "@/lib/auth/redirect";
import {
  parsePlaceForm,
  suggestionResultSchema,
  type PlaceFieldErrors,
  type PlaceMatch,
} from "@/lib/domain/place";
import type { PlaceCandidate } from "@/lib/domain/place-search";
import { getPlaceSearcher } from "@/lib/places/search";
import {
  createUserServerSupabase,
  getVerifiedUserId,
} from "@/lib/supabase/server";

export type SuggestFormValues = {
  name: string;
  address: string;
  categorySlug: string;
};

export type SuggestState = {
  version: number;
  values?: SuggestFormValues;
  fieldErrors?: PlaceFieldErrors;
  message?: string;
  outcome?:
    | { kind: "blocked"; matches: PlaceMatch[] }
    | { kind: "needs_confirmation"; matches: PlaceMatch[] }
    | { kind: "created"; restaurantId: string };
};

function messageFor(code: string | undefined): string {
  switch (code) {
    case "HS429":
      return "하루에 제안할 수 있는 장소 수(5곳)를 넘었어요. 내일 다시 시도해 주세요.";
    case "22023":
      return "입력값을 확인해 주세요.";
    case "42501":
      return "로그인이 필요해요.";
    default:
      return "제안을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
}

export async function suggestPlace(
  prev: SuggestState,
  formData: FormData,
): Promise<SuggestState> {
  const supabase = await createUserServerSupabase();
  if (!(await getVerifiedUserId(supabase))) redirect(loginPath("/suggest"));

  const version = prev.version + 1;
  const values: SuggestFormValues = {
    name: String(formData.get("name") ?? ""),
    address: String(formData.get("address") ?? ""),
    categorySlug: String(formData.get("categorySlug") ?? ""),
  };

  const parsed = parsePlaceForm(formData);
  if (!parsed.success) {
    return { version, values, fieldErrors: parsed.fieldErrors };
  }
  const input = parsed.data;

  const { data, error } = await supabase.rpc("suggest_restaurant", {
    name: input.name,
    address: input.address,
    lat: input.lat,
    lng: input.lng,
    category_slug: input.categorySlug,
    confirm_not_duplicate: input.confirmNotDuplicate,
  });
  if (error) {
    console.error("suggest_restaurant failed", error.code);
    return { version, values, message: messageFor(error.code) };
  }

  const result = suggestionResultSchema.safeParse(data);
  if (!result.success) {
    console.error("suggest_restaurant: unexpected response shape");
    return { version, values, message: messageFor(undefined) };
  }

  switch (result.data.status) {
    case "created":
      return {
        version,
        outcome: { kind: "created", restaurantId: result.data.restaurant_id },
      };
    case "blocked":
      return {
        version,
        values,
        outcome: { kind: "blocked", matches: result.data.matches },
      };
    case "needs_confirmation":
      return {
        version,
        values,
        outcome: { kind: "needs_confirmation", matches: result.data.matches },
      };
  }
}

export type PlaceSearchResult =
  { ok: true; candidates: PlaceCandidate[] } | { ok: false; message: string };

/** Restaurant name search that prefills the form (WP-08, C-83). */
export async function searchPlaces(query: string): Promise<PlaceSearchResult> {
  const supabase = await createUserServerSupabase();
  if (!(await getVerifiedUserId(supabase))) {
    return { ok: false, message: "로그인이 필요해요." };
  }
  const q = String(query ?? "")
    .trim()
    .slice(0, 50);
  if (q.length < 2) {
    return { ok: false, message: "두 글자 이상 입력해 주세요." };
  }
  const search = getPlaceSearcher();
  if (!search) {
    return {
      ok: false,
      message: "지금은 식당 검색을 쓸 수 없어요. 직접 입력해 주세요.",
    };
  }
  try {
    return { ok: true, candidates: await search(q) };
  } catch (e) {
    console.error("place search failed", e instanceof Error ? e.message : e);
    return {
      ok: false,
      message: "검색하지 못했어요. 잠시 후 다시 시도하거나 직접 입력해 주세요.",
    };
  }
}
