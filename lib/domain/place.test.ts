import { describe, expect, it } from "vitest";
import {
  describeMatch,
  parsePlaceForm,
  suggestionResultSchema,
  type PlaceMatch,
} from "./place";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

const valid = {
  name: "  새 국숫집 ",
  address: " 서울 중구 예시로 1 ",
  categorySlug: "korean",
  lat: "37.5663",
  lng: "126.9779",
};

describe("parsePlaceForm", () => {
  it("parses and trims a suggestion", () => {
    expect(parsePlaceForm(form(valid))).toEqual({
      success: true,
      data: {
        name: "새 국숫집",
        address: "서울 중구 예시로 1",
        categorySlug: "korean",
        lat: 37.5663,
        lng: 126.9779,
        confirmNotDuplicate: false,
      },
    });
  });

  it("reads the duplicate confirmation checkbox", () => {
    const result = parsePlaceForm(
      form({ ...valid, confirmNotDuplicate: "on" }),
    );
    expect(result.success && result.data.confirmNotDuplicate).toBe(true);
  });

  it("rejects symbol-only names, short addresses and missing category", () => {
    const result = parsePlaceForm(
      form({ ...valid, name: "!!!", address: "서", categorySlug: "" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.name).toBe("이름에 글자나 숫자가 필요해요.");
      expect(result.fieldErrors.address).toBe("주소를 입력해 주세요.");
      expect(result.fieldErrors.categorySlug).toBeDefined();
    }
  });

  it("asks to re-pick the location on bad coordinates", () => {
    const result = parsePlaceForm(
      form({ ...valid, lat: "126.9", lng: "37.5" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.lat).toBe("지도에서 위치를 다시 골라 주세요.");
    }
  });
});

const match = (overrides: Partial<PlaceMatch>): PlaceMatch => ({
  restaurant_id: "00000000-0000-4000-8000-000000000001",
  restaurant_name: "테스트 식당",
  status: "approved",
  mine: false,
  distance_m: 12,
  reason: "very_close",
  blocking: false,
  ...overrides,
});

describe("describeMatch", () => {
  it("never reveals hidden proposals", () => {
    expect(
      describeMatch(
        match({
          restaurant_id: null,
          restaurant_name: null,
          status: "pending",
        }),
      ),
    ).toBe("이미 검수 중인 제안이 있어요");
  });

  it("marks the user's own pending proposal", () => {
    expect(describeMatch(match({ status: "pending", mine: true }))).toBe(
      "테스트 식당 (내가 제안, 검수 대기)",
    );
  });
});

describe("suggestionResultSchema", () => {
  it("accepts the RPC shapes and rejects unexpected ones", () => {
    expect(
      suggestionResultSchema.safeParse({
        status: "created",
        restaurant_id: "00000000-0000-4000-8000-000000000002",
        matches: [],
      }).success,
    ).toBe(true);
    expect(
      suggestionResultSchema.safeParse({ status: "created", matches: [] })
        .success,
    ).toBe(false);
    expect(
      suggestionResultSchema.safeParse({ status: "approved", matches: [] })
        .success,
    ).toBe(false);
  });
});
