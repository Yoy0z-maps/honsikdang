// Place search results (WP-08, decisions C-83/C-88). Pure helpers that turn
// a NAVER local search item into prefill values for the suggestion form.

export type PlaceCandidate = {
  name: string;
  address: string;
  /** NAVER category text, e.g. "한식>국밥". */
  categoryText: string;
  categorySlug: string | null;
  /** WGS84; null when the coordinates could not be read. */
  position: { lat: number; lng: number } | null;
};

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

/** Removes the <b> highlight tags and decodes the common entities. */
export function cleanText(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|apos);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * NAVER local search returns mapx/mapy as WGS84 degrees × 10^7 (e.g.
 * "1269780000"). Anything outside Korea's range is treated as unreadable
 * (older responses used another projection), and the user places the pin.
 */
export function parseNaverCoord(
  mapx: string | number | undefined,
  mapy: string | number | undefined,
): { lat: number; lng: number } | null {
  const lng = Number(mapx) / 1e7;
  const lat = Number(mapy) / 1e7;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < 33 || lat > 38.7 || lng < 124.5 || lng > 132) return null;
  return { lat, lng };
}

const CATEGORY_RULES: [RegExp, string][] = [
  [/카페|커피|베이커리|제과|디저트|빵/, "cafe_bakery"],
  [/분식|김밥|떡볶이|라면/, "bunsik"],
  [/패스트푸드|햄버거|버거|치킨|피자|샌드위치/, "fast_food"],
  [/일식|초밥|스시|라멘|우동|돈가스|돈까스|덮밥|이자카야|일본/, "japanese"],
  [/중식|중국|마라|짜장|짬뽕|딤섬/, "chinese"],
  [/양식|이탈리|파스타|스테이크|레스토랑|프랑스|브런치|샐러드/, "western"],
  [/아시아|베트남|쌀국수|태국|인도|커리|카레|멕시코/, "asian"],
  [
    /한식|국밥|백반|찌개|냉면|국수|고기|구이|탕|족발|보쌈|곱창|순대|한정식/,
    "korean",
  ],
];

/** Best guess of our food type from NAVER's category text; null if unsure. */
export function guessCategory(categoryText: string): string | null {
  for (const [re, slug] of CATEGORY_RULES)
    if (re.test(categoryText)) return slug;
  return null;
}

type NaverLocalItem = {
  title?: string;
  category?: string;
  address?: string;
  roadAddress?: string;
  mapx?: string | number;
  mapy?: string | number;
};

export function toCandidate(item: NaverLocalItem): PlaceCandidate | null {
  const name = cleanText(item.title ?? "");
  const address = cleanText(item.roadAddress || item.address || "");
  if (!name || !address) return null;
  const categoryText = cleanText(item.category ?? "");
  return {
    name: name.slice(0, 80),
    address: address.slice(0, 200),
    categoryText,
    categorySlug: guessCategory(categoryText),
    position: parseNaverCoord(item.mapx, item.mapy),
  };
}
