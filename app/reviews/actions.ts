"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { loginPath } from "@/lib/auth/redirect";
import {
  parseReviewForm,
  toReviewRpcArgs,
  type ReviewFieldErrors,
} from "@/lib/domain/review";
import {
  createUserServerSupabase,
  getVerifiedUserId,
} from "@/lib/supabase/server";

export type ReviewFormValues = Record<string, string | string[]>;

export type ReviewFormState = {
  version: number;
  message?: string;
  fieldErrors?: ReviewFieldErrors;
  values?: ReviewFormValues;
};

const uuid = z.string().uuid();

function formValues(formData: FormData): ReviewFormValues {
  const values: ReviewFormValues = {};
  for (const key of [
    "visitedAt",
    "soloComfort",
    "seatType",
    "soloOrderAvailable",
    "pricePaid",
    "waitMinutes",
    "body",
  ]) {
    values[key] = String(formData.get(key) ?? "");
  }
  values.tags = formData.getAll("tags").map(String);
  return values;
}

/** Translates database errors into messages; never leaks raw details. */
function messageFor(code: string | undefined): string {
  switch (code) {
    case "23505":
      return "이미 이 식당에 리뷰를 썼어요. 내 리뷰에서 수정해 주세요.";
    case "HS429":
      return "하루에 쓸 수 있는 리뷰 수(10개)를 넘었어요. 내일 다시 시도해 주세요.";
    case "42501":
      return "이 리뷰는 작성하거나 수정할 수 없어요.";
    case "P0002":
      return "리뷰를 찾을 수 없어요.";
    case "23514":
    case "22023":
      return "입력값을 확인해 주세요.";
    default:
      return "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
}

async function requireUser(next: string) {
  const supabase = await createUserServerSupabase();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) redirect(loginPath(next));
  return supabase;
}

export async function createReview(
  restaurantId: string,
  prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  if (!uuid.safeParse(restaurantId).success) redirect("/");
  const supabase = await requireUser(`/restaurants/${restaurantId}/review`);
  const values = formValues(formData);
  const version = prev.version + 1;

  const parsed = parseReviewForm(formData);
  if (!parsed.success) {
    return { version, fieldErrors: parsed.fieldErrors, values };
  }

  const { error } = await supabase.rpc("submit_review", {
    restaurant_id: restaurantId,
    ...toReviewRpcArgs(parsed.data),
  });
  if (error) {
    console.error("submit_review failed", error.code);
    return { version, message: messageFor(error.code), values };
  }
  redirect("/me/reviews?saved=created");
}

export async function updateReview(
  reviewId: string,
  prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  if (!uuid.safeParse(reviewId).success) redirect("/me/reviews");
  const supabase = await requireUser(`/me/reviews/${reviewId}/edit`);
  const values = formValues(formData);
  const version = prev.version + 1;

  const parsed = parseReviewForm(formData);
  if (!parsed.success) {
    return { version, fieldErrors: parsed.fieldErrors, values };
  }

  const { error } = await supabase.rpc("update_my_review", {
    review_id: reviewId,
    ...toReviewRpcArgs(parsed.data),
  });
  if (error) {
    console.error("update_my_review failed", error.code);
    return { version, message: messageFor(error.code), values };
  }
  redirect("/me/reviews?saved=updated");
}

export async function deleteReview(formData: FormData): Promise<void> {
  const reviewId = String(formData.get("reviewId") ?? "");
  if (!uuid.safeParse(reviewId).success) redirect("/me/reviews");
  const supabase = await requireUser("/me/reviews");

  // RLS limits deletes to the author's own, non-removed reviews.
  const { data, error } = await supabase
    .from("restaurant_reviews")
    .delete()
    .eq("id", reviewId)
    .select("id");
  if (error) console.error("review delete failed", error.code);
  redirect(
    !error && data && data.length === 1
      ? "/me/reviews?saved=deleted"
      : "/me/reviews?saved=delete-failed",
  );
}
