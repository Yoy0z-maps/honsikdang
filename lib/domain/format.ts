const won = new Intl.NumberFormat("ko-KR");

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatPrice(krw: number): string {
  return `${won.format(krw)}원`;
}

/** Formats an ISO date (YYYY-MM-DD or timestamp) as YYYY.MM.DD in Korea time. */
export function formatDate(iso: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(`${iso}T00:00:00+09:00`)
    : new Date(iso);
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}.${get("month")}.${get("day")}`;
}

export const SEAT_TYPE_LABELS: Record<string, string> = {
  counter: "바/카운터석",
  single_table: "1인 테이블",
  shared_table: "합석 테이블",
  booth: "칸막이석",
  other: "기타",
};
