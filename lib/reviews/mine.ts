import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import type { ReviewFormValues } from "@/app/reviews/actions";

const myReviewSchema = z.object({
  id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  restaurant_name: z.string(),
  restaurant_status: z.enum(["pending", "approved", "rejected", "archived"]),
  visited_at: z.string(),
  solo_comfort: z.number(),
  seat_type: z.string(),
  solo_order_available: z.boolean().nullable(),
  price_paid: z.number().nullable(),
  wait_minutes: z.number().nullable(),
  body: z.string().nullable(),
  status: z.enum(["pending", "approved", "rejected", "removed"]),
  tag_slugs: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
});

export type MyReview = z.infer<typeof myReviewSchema>;

export const REVIEW_STATUS_LABELS: Record<MyReview["status"], string> = {
  pending: "검수 대기",
  approved: "공개됨",
  rejected: "반려됨",
  removed: "운영자가 비공개 처리함",
};

export async function fetchMyReviews(
  client: SupabaseClient<Database>,
  reviewId?: string,
): Promise<MyReview[]> {
  const { data, error } = await client.rpc(
    "my_reviews",
    reviewId ? { review_id: reviewId } : {},
  );
  if (error) throw new Error(`my_reviews failed: ${error.code}`);
  return z.array(myReviewSchema).parse(data);
}

export function toFormValues(review: MyReview): ReviewFormValues {
  return {
    visitedAt: review.visited_at,
    soloComfort: String(review.solo_comfort),
    seatType: review.seat_type,
    soloOrderAvailable:
      review.solo_order_available === null
        ? ""
        : review.solo_order_available
          ? "yes"
          : "no",
    pricePaid: review.price_paid === null ? "" : String(review.price_paid),
    waitMinutes:
      review.wait_minutes === null ? "" : String(review.wait_minutes),
    body: review.body ?? "",
    tags: review.tag_slugs,
  };
}
