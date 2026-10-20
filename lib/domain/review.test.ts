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
  overallRating: "5",
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
        overallRating: 5,
        soloOrderAvailable: true,
        pricePaid: 9500,
        waitMinutes: null,
        body: "좋았어요",
        tags: ["solo_seat", "quiet"],
        menuItems: [],
      },
    });
  });

  it("accepts only the required fields", () => {
    const result = parseReviewForm(
      form({
        visitedAt: TODAY,
        soloComfort: "3",
        seatType: "booth",
        overallRating: "3",
      }),
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
        "overallRating",
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

describe("menu items (C-86)", () => {
  const withMenu = (names: string[], prices: string[]) =>
    parseReviewForm(
      form({ ...valid, menuName: names, menuPrice: prices }),
      TODAY,
    );

  it("keeps filled rows, trims names, drops empty rows", () => {
    const result = withMenu([" 순대국밥 ", "", "수육"], ["9,000", "", "15000"]);
    expect(result.success && result.data.menuItems).toEqual([
      { name: "순대국밥", price: 9000 },
      { name: "수육", price: 15000 },
    ]);
  });

  it("rejects half-filled rows, bad prices and more than 5 items", () => {
    for (const [names, prices] of [
      [["국밥"], [""]],
      [[""], ["9000"]],
      [["국밥"], ["50"]],
      [["가".repeat(41)], ["9000"]],
      [
        ["a", "b", "c", "d", "e", "f"],
        ["1000", "1000", "1000", "1000", "1000", "1000"],
      ],
    ]) {
      const result = withMenu(names, prices);
      expect(result.success, String(names)).toBe(false);
      if (!result.success) expect(result.fieldErrors.menuItems).toBeDefined();
    }
  });

  it("requires a star rating from 1 to 5", () => {
    for (const rating of ["", "0", "6", "3.5"]) {
      const result = parseReviewForm(
        form({ ...valid, overallRating: rating }),
        TODAY,
      );
      expect(result.success, rating).toBe(false);
    }
  });
});

describe("toReviewRpcArgs", () => {
  it("omits null optionals so SQL defaults apply", () => {
    const parsed = parseReviewForm(
      form({
        visitedAt: TODAY,
        soloComfort: "3",
        seatType: "booth",
        overallRating: "4",
      }),
      TODAY,
    );
    if (!parsed.success) throw new Error("expected success");
    const args = toReviewRpcArgs(parsed.data);
    expect(args.overall_rating).toBe(4);
    expect(args.menu_items).toEqual([]);
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
