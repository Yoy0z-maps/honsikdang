import { describe, expect, it } from "vitest";
import {
  cleanText,
  guessCategory,
  parseNaverCoord,
  toCandidate,
} from "./place-search";

describe("cleanText", () => {
  it("removes highlight tags and decodes entities", () => {
    expect(cleanText("<b>혼밥</b> 국밥 &amp; 수육")).toBe("혼밥 국밥 & 수육");
  });
});

describe("parseNaverCoord", () => {
  it("reads WGS84 × 10^7 values", () => {
    expect(parseNaverCoord("1269780000", "375660000")).toEqual({
      lat: 37.566,
      lng: 126.978,
    });
  });

  it("rejects values outside Korea or unreadable ones", () => {
    expect(parseNaverCoord("309946", "552183")).toBeNull(); // old projection
    expect(parseNaverCoord(undefined, undefined)).toBeNull();
    expect(parseNaverCoord("375660000", "1269780000")).toBeNull(); // swapped
  });
});

describe("guessCategory", () => {
  it.each([
    ["한식>국밥", "korean"],
    ["일식>라멘", "japanese"],
    ["중식>중식당", "chinese"],
    ["양식>이탈리아음식", "western"],
    ["분식", "bunsik"],
    ["아시아음식>베트남음식", "asian"],
    ["패스트푸드>햄버거", "fast_food"],
    ["카페,디저트>베이커리", "cafe_bakery"],
  ])("%s → %s", (text, slug) => expect(guessCategory(text)).toBe(slug));

  it("returns null when unsure", () => {
    expect(guessCategory("술집>바")).toBeNull();
  });
});

describe("toCandidate", () => {
  it("prefers the road address and keeps the category guess", () => {
    expect(
      toCandidate({
        title: "<b>시청</b>국밥",
        category: "한식>국밥",
        address: "서울특별시 중구 태평로1가 31",
        roadAddress: "서울특별시 중구 세종대로 110",
        mapx: "1269780000",
        mapy: "375660000",
      }),
    ).toEqual({
      name: "시청국밥",
      address: "서울특별시 중구 세종대로 110",
      categoryText: "한식>국밥",
      categorySlug: "korean",
      position: { lat: 37.566, lng: 126.978 },
    });
  });

  it("skips items without a name or address", () => {
    expect(toCandidate({ title: "", address: "서울" })).toBeNull();
    expect(toCandidate({ title: "국밥집" })).toBeNull();
  });
});
