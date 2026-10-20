import { z } from "zod";

export const SEAT_TYPES = [
  "counter",
  "single_table",
  "shared_table",
  "booth",
  "other",
] as const;
export type SeatType = (typeof SEAT_TYPES)[number];

export const MAX_REVIEW_BODY = 1000;
export const MAX_REVIEW_TAGS = 6;
export const MAX_MENU_ITEMS = 5;
export const MAX_MENU_NAME = 40;

export type MenuItem = { name: string; price: number };

/** "메뉴 + 가격" rows (C-86): empty rows are ignored, half-filled ones are errors. */
const menuItemsSchema = z
  .array(z.object({ name: z.string(), price: z.string() }))
  .transform((rows, ctx) => {
    const items: MenuItem[] = [];
    for (const row of rows) {
      const name = row.name.trim();
      const priceText = row.price.trim().replaceAll(",", "");
      if (!name && !priceText) continue;
      if (!name || !priceText) {
        ctx.addIssue({
          code: "custom",
          message: "메뉴 이름과 가격을 함께 입력해 주세요.",
        });
        return z.NEVER;
      }
      const price = Number(priceText);
      if (name.length > MAX_MENU_NAME) {
        ctx.addIssue({
          code: "custom",
          message: `메뉴 이름은 ${MAX_MENU_NAME}자 이내로 써 주세요.`,
        });
        return z.NEVER;
      }
      if (!Number.isInteger(price) || price < 100 || price > 1_000_000) {
        ctx.addIssue({
          code: "custom",
          message: "메뉴 가격은 100~1,000,000원 사이로 입력해 주세요.",
        });
        return z.NEVER;
      }
      items.push({ name, price });
    }
    if (items.length > MAX_MENU_ITEMS) {
      ctx.addIssue({
        code: "custom",
        message: `메뉴는 ${MAX_MENU_ITEMS}개까지 적을 수 있어요.`,
      });
      return z.NEVER;
    }
    return items;
  });

/** Today's date in Korea (YYYY-MM-DD); the DB rejects later visit dates. */
export function todayInKorea(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const optionalInt = (max: number, message: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === "") return null;
      const n = Number(value.replaceAll(",", ""));
      if (!Number.isInteger(n) || n < 0 || n > max) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return n;
    });

export function reviewInputSchema(today: string = todayInKorea()) {
  return z.object({
    visitedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "방문일을 선택해 주세요.")
      .refine((d) => d >= "2000-01-01", "방문일을 확인해 주세요.")
      .refine((d) => d <= today, "미래 날짜는 선택할 수 없어요."),
    soloComfort: z.coerce
      .number({ message: "혼밥 편안함을 골라 주세요." })
      .int()
      .min(1, "혼밥 편안함을 골라 주세요.")
      .max(5, "혼밥 편안함을 골라 주세요."),
    seatType: z.enum(SEAT_TYPES, { message: "좌석 유형을 골라 주세요." }),
    overallRating: z.coerce
      .number({ message: "별점을 골라 주세요." })
      .int()
      .min(1, "별점을 골라 주세요.")
      .max(5, "별점을 골라 주세요."),
    soloOrderAvailable: z
      .enum(["yes", "no", ""])
      .transform((v) => (v === "" ? null : v === "yes")),
    pricePaid: optionalInt(
      1_000_000,
      "가격은 0~1,000,000원 사이로 입력해 주세요.",
    ),
    waitMinutes: optionalInt(600, "대기 시간은 0~600분 사이로 입력해 주세요."),
    body: z
      .string()
      .max(MAX_REVIEW_BODY, `후기는 ${MAX_REVIEW_BODY}자 이내로 써 주세요.`)
      .transform((v) => (v.trim() === "" ? null : v.trim())),
    tags: z
      .array(z.string().regex(/^[a-z][a-z0-9_]*$/))
      .max(MAX_REVIEW_TAGS)
      .transform((tags) => [...new Set(tags)]),
    menuItems: menuItemsSchema,
  });
}

export type ReviewInput = z.output<ReturnType<typeof reviewInputSchema>>;
export type ReviewFieldErrors = Partial<Record<keyof ReviewInput, string>>;

export function parseReviewForm(
  formData: FormData,
  today?: string,
):
  | { success: true; data: ReviewInput }
  | { success: false; fieldErrors: ReviewFieldErrors } {
  const result = reviewInputSchema(today).safeParse({
    visitedAt: String(formData.get("visitedAt") ?? ""),
    soloComfort: formData.get("soloComfort") ?? "",
    seatType: formData.get("seatType") ?? "",
    overallRating: formData.get("overallRating") ?? "",
    soloOrderAvailable: String(formData.get("soloOrderAvailable") ?? ""),
    pricePaid: String(formData.get("pricePaid") ?? ""),
    waitMinutes: String(formData.get("waitMinutes") ?? ""),
    body: String(formData.get("body") ?? ""),
    tags: formData.getAll("tags").map(String),
    menuItems: (() => {
      const names = formData.getAll("menuName").map(String);
      const prices = formData.getAll("menuPrice").map(String);
      return names.map((name, i) => ({ name, price: prices[i] ?? "" }));
    })(),
  });
  if (result.success) return { success: true, data: result.data };

  const fieldErrors: ReviewFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof ReviewInput;
    fieldErrors[key] ??= issue.message;
  }
  return { success: false, fieldErrors };
}

/** Maps RPC arguments; nulls become undefined so SQL defaults apply. */
export function toReviewRpcArgs(input: ReviewInput) {
  return {
    visited_at: input.visitedAt,
    solo_comfort: input.soloComfort,
    seat_type: input.seatType,
    overall_rating: input.overallRating,
    menu_items: input.menuItems,
    solo_order_available: input.soloOrderAvailable ?? undefined,
    price_paid: input.pricePaid ?? undefined,
    wait_minutes: input.waitMinutes ?? undefined,
    body: input.body ?? undefined,
    tag_slugs: input.tags,
  };
}
