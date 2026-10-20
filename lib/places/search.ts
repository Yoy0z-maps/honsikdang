import "server-only";
import { isLocalSupabase } from "@/lib/ai";
import { toCandidate, type PlaceCandidate } from "@/lib/domain/place-search";

/**
 * Place name search for the suggestion form (WP-08, C-83). NAVER Search API
 * "지역" (developers.naver.com); keys are server-only. Returns null when the
 * search is not configured, so the form simply hides the search box.
 */
export type PlaceSearcher = (query: string) => Promise<PlaceCandidate[]>;

const NAVER_LOCAL_URL = "https://openapi.naver.com/v1/search/local.json";

function naverSearcher(id: string, secret: string): PlaceSearcher {
  return async (query) => {
    const url = `${NAVER_LOCAL_URL}?${new URLSearchParams({
      query,
      display: "5",
      sort: "random",
    })}`;
    const res = await fetch(url, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`naver local search ${res.status}`);
    const body = (await res.json()) as { items?: unknown };
    const items = Array.isArray(body.items) ? body.items : [];
    return items.flatMap((item) => toCandidate(item ?? {}) ?? []);
  };
}

/**
 * TEST FIXTURE, not a product feature: canned results so e2e runs without
 * keys. Only with PLACE_SEARCH_PROVIDER=fixture against a local Supabase.
 * "오류검색" fails; anything with no match returns [].
 */
const fixtureSearcher: PlaceSearcher = async (query) => {
  if (query.includes("오류검색")) throw new Error("fixture failure");
  const items = [
    {
      title: "<b>혼밥</b>테스트국밥",
      category: "한식>국밥",
      roadAddress: "서울특별시 중구 세종대로 110",
      mapx: "1269779000",
      mapy: "375664000",
    },
    {
      title: "혼밥테스트라멘",
      category: "일식>라멘",
      roadAddress: "서울특별시 중구 을지로 30",
      mapx: "1269812000",
      mapy: "375658000",
    },
  ];
  return items
    .filter((i) => i.title.replace(/<[^>]*>/g, "").includes(query.trim()))
    .flatMap((i) => toCandidate(i) ?? []);
};

export function getPlaceSearcher(): PlaceSearcher | null {
  const provider = process.env.PLACE_SEARCH_PROVIDER?.trim() || "naver";
  if (provider === "fixture") return isLocalSupabase() ? fixtureSearcher : null;
  if (provider !== "naver") return null;
  const id = process.env.NAVER_SEARCH_CLIENT_ID?.trim();
  const secret = process.env.NAVER_SEARCH_CLIENT_SECRET?.trim();
  return id && secret ? naverSearcher(id, secret) : null;
}
