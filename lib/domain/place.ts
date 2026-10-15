import { z } from "zod";

export const MAX_PLACE_NAME = 100;
export const MAX_PLACE_ADDRESS = 200;

const hasLetterOrDigit = /[\p{L}\p{N}]/u;

export const placeInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "식당 이름을 입력해 주세요.")
    .max(MAX_PLACE_NAME, `이름은 ${MAX_PLACE_NAME}자 이내로 입력해 주세요.`)
    .refine((v) => hasLetterOrDigit.test(v), "이름에 글자나 숫자가 필요해요."),
  address: z
    .string()
    .trim()
    .min(2, "주소를 입력해 주세요.")
    .max(
      MAX_PLACE_ADDRESS,
      `주소는 ${MAX_PLACE_ADDRESS}자 이내로 입력해 주세요.`,
    ),
  categorySlug: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/, "카테고리를 골라 주세요."),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  confirmNotDuplicate: z.boolean(),
});

export type PlaceInput = z.output<typeof placeInputSchema>;
export type PlaceFieldErrors = Partial<Record<keyof PlaceInput, string>>;

export function parsePlaceForm(
  formData: FormData,
):
  | { success: true; data: PlaceInput }
  | { success: false; fieldErrors: PlaceFieldErrors } {
  const result = placeInputSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    address: String(formData.get("address") ?? ""),
    categorySlug: String(formData.get("categorySlug") ?? ""),
    lat: formData.get("lat") ?? "",
    lng: formData.get("lng") ?? "",
    confirmNotDuplicate: formData.get("confirmNotDuplicate") === "on",
  });
  if (result.success) return { success: true, data: result.data };
  const fieldErrors: PlaceFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof PlaceInput;
    fieldErrors[key] ??=
      key === "lat" || key === "lng"
        ? "지도에서 위치를 다시 골라 주세요."
        : issue.message;
  }
  return { success: false, fieldErrors };
}

// Shape returned by public.suggest_restaurant (jsonb): validated, not trusted.
const matchSchema = z.object({
  restaurant_id: z.string().uuid().nullable(),
  restaurant_name: z.string().nullable(),
  status: z.enum(["approved", "pending"]),
  mine: z.boolean(),
  distance_m: z.number(),
  reason: z.enum(["same_name", "very_close", "similar_name"]),
  blocking: z.boolean(),
});

export const suggestionResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("created"),
    restaurant_id: z.string().uuid(),
    matches: z.array(matchSchema),
  }),
  z.object({ status: z.literal("blocked"), matches: z.array(matchSchema) }),
  z.object({
    status: z.literal("needs_confirmation"),
    matches: z.array(matchSchema),
  }),
]);

export type PlaceMatch = z.infer<typeof matchSchema>;
export type SuggestionResult = z.infer<typeof suggestionResultSchema>;

export const MATCH_REASON_LABELS: Record<PlaceMatch["reason"], string> = {
  same_name: "같은 이름",
  very_close: "20m 이내",
  similar_name: "비슷한 이름",
};

/** Human description of a match without revealing hidden proposals (Q27). */
export function describeMatch(match: PlaceMatch): string {
  if (match.restaurant_name === null) return "이미 검수 중인 제안이 있어요";
  if (match.mine && match.status === "pending")
    return `${match.restaurant_name} (내가 제안, 검수 대기)`;
  return match.restaurant_name;
}
