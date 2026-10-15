import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

const reviewSchema = z.object({
  id: z.string().uuid(),
  visited_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  solo_comfort: z.number().int().min(1).max(5),
  seat_type: z.string(),
  solo_order_available: z.boolean().nullable(),
  price_paid: z.number().nullable(),
  wait_minutes: z.number().nullable(),
  body: z.string().nullable(),
  tags: z.array(z.string()),
});

export const restaurantDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  category: z.object({ slug: z.string(), label: z.string() }),
  source_type: z.enum(["user_submitted", "admin_entered"]),
  created_at: z.string(),
  updated_at: z.string(),
  summary: z.object({
    review_count: z.number(),
    avg_solo_comfort: z.number().nullable(),
    median_price: z.number().nullable(),
    price_sample_count: z.number(),
    median_wait_minutes: z.number().nullable(),
    wait_sample_count: z.number(),
    solo_order_yes: z.number(),
    solo_order_no: z.number(),
    last_visited_at: z.string().nullable(),
  }),
  tags: z.array(
    z.object({ slug: z.string(), label: z.string(), review_count: z.number() }),
  ),
  reviews: z.array(reviewSchema),
});

export type RestaurantDetail = z.infer<typeof restaurantDetailSchema>;
export type RestaurantReview = z.infer<typeof reviewSchema>;

/** Returns null when the restaurant does not exist or is not approved. */
export async function fetchRestaurantDetail(
  client: SupabaseClient<Database>,
  id: string,
): Promise<RestaurantDetail | null> {
  const { data, error } = await client.rpc("restaurant_detail", {
    restaurant_id: id,
  });
  if (error) throw new Error(`restaurant_detail failed: ${error.message}`);
  if (data === null) return null;
  return restaurantDetailSchema.parse(data);
}
