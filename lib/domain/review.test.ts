import { describe, expect, it } from "vitest";
import { parseReviewForm, toReviewRpcArgs, todayInKorea } from "./review";

const TODAY = "2026-10-15";

function form(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  }
  return data;
}

const valid = {
  visitedAt: "2026-10-01",
  soloComfort: "4",
  seatType: "counter",
  soloOrderAvailable: "yes",
  pricePaid: "9,500",
  waitMinutes: "",
  body: "  좋았어요  ",
  tags: ["solo_seat", "solo_seat", "quiet"],
};

describe("parseReviewForm", () => {
  it("parses a complete review", () => {
    const result = parseReviewForm(form(valid), TODAY);
    expect(result).toEqual({
      success: true,
      data: {
        visitedAt: "2026-10-01",
        soloComfort: 4,
        seatType: "counter",
        soloOrderAvailable: true,
        pricePaid: 9500,
        waitMinutes: null,
        body: "좋았어요",
        tags: ["solo_seat", "quiet"],
      },
    });
  });

  it("accepts only the required fields", () => {
    const result = parseReviewForm(
      form({ visitedAt: TODAY, soloComfort: "3", seatType: "booth" }),
      TODAY,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.soloOrderAvailable).toBeNull();
      expect(result.data.body).toBeNull();
      expect(result.data.tags).toEqual([]);
    }
  });

  it("reports field errors for missing required fields", () => {
    const result = parseReviewForm(form({}), TODAY);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.fieldErrors).sort()).toEqual([
        "seatType",
        "soloComfort",
        "visitedAt",
      ]);
    }
  });

  it("rejects future dates, bad ranges and long bodies", () => {
    const result = parseReviewForm(
      form({
        ...valid,
        visitedAt: "2026-10-16",
        soloComfort: "6",
        pricePaid: "-1",
        waitMinutes: "601",
        body: "가".repeat(1001),
      }),
      TODAY,
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.visitedAt).toBe(
        "미래 날짜는 선택할 수 없어요.",
      );
      expect(result.fieldErrors.soloComfort).toBeDefined();
      expect(result.fieldErrors.pricePaid).toBeDefined();
      expect(result.fieldErrors.waitMinutes).toBeDefined();
      expect(result.fieldErrors.body).toBeDefined();
    }
  });

  it("rejects unknown seat types and malformed tags", () => {
    const result = parseReviewForm(
      form({ ...valid, seatType: "rooftop", tags: ["Bad Tag"] }),
      TODAY,
    );
    expect(result.success).toBe(false);
  });
});

describe("toReviewRpcArgs", () => {
  it("omits null optionals so SQL defaults apply", () => {
    const parsed = parseReviewForm(
      form({ visitedAt: TODAY, soloComfort: "3", seatType: "booth" }),
      TODAY,
    );
    if (!parsed.success) throw new Error("expected success");
    const args = toReviewRpcArgs(parsed.data);
    expect(args.price_paid).toBeUndefined();
    expect(args.solo_order_available).toBeUndefined();
    expect(args.body).toBeUndefined();
  });

  it("keeps an explicit 'no' for solo ordering", () => {
    const parsed = parseReviewForm(
      form({ ...valid, soloOrderAvailable: "no" }),
      TODAY,
    );
    if (!parsed.success) throw new Error("expected success");
    expect(toReviewRpcArgs(parsed.data).solo_order_available).toBe(false);
  });
});

describe("todayInKorea", () => {
  it("uses Korea time", () => {
    expect(todayInKorea(new Date("2026-10-14T16:00:00Z"))).toBe("2026-10-15");
  });
});
