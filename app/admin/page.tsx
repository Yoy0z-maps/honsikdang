import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ModerationForm } from "@/features/admin/ModerationForm";
import { ReportResolutionForm } from "@/features/admin/ReportResolutionForm";
import { formatDate, formatPrice, SEAT_TYPE_LABELS } from "@/lib/domain/format";
import { MATCH_REASON_LABELS } from "@/lib/domain/place";
import { createUserServerSupabase } from "@/lib/supabase/server";

const TABS = [
  ["places", "대기 장소"],
  ["reviews", "대기 리뷰"],
  ["reports", "열린 신고"],
  ["log", "검수 기록"],
] as const;
type Tab = (typeof TABS)[number][0];

const RESULT_MESSAGES: Record<string, string> = {
  "done-approve": "승인했어요.",
  "done-reject": "반려했어요.",
  "done-archive": "보관했어요.",
  "done-remove": "비공개 처리했어요.",
  "done-restore": "복원했어요.",
  "done-resolve": "신고를 해결했어요.",
  "done-dismiss": "신고를 기각했어요.",
  conflict:
    "이미 다른 운영자가 처리했거나 상태가 바뀌었어요. 목록을 새로 확인해 주세요.",
  "reason-required": "이 동작에는 사유가 필요해요.",
  "not-found": "대상을 찾을 수 없어요.",
  invalid: "요청을 확인해 주세요.",
  forbidden: "권한이 없어요.",
  error: "처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
};

const PLACE_STATUS_LABELS: Record<string, string> = {
  approved: "공개",
  pending: "검수 대기",
};

const REPORT_REASON_LABELS: Record<string, string> = {
  incorrect_info: "정보 오류",
  closed: "폐업",
  duplicate: "중복",
  inappropriate: "부적절",
  spam: "스팸",
  other: "기타",
};

const candidateSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    reason: z.string(),
    distance_m: z.number(),
  }),
);

async function AdminContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin">["searchParams"];
}) {
  const supabase = await createUserServerSupabase();
  const { data: isAdmin } = await supabase.rpc("am_i_admin");
  // Hide the console's existence from everyone else (Q31).
  if (isAdmin !== true) notFound();

  const params = await searchParams;
  const tab: Tab = TABS.some(([t]) => t === params.tab)
    ? (params.tab as Tab)
    : "places";
  const result =
    typeof params.result === "string"
      ? RESULT_MESSAGES[params.result]
      : undefined;

  const [places, reviews, reports, log] = await Promise.all([
    supabase.rpc("admin_pending_places"),
    supabase
      .from("restaurant_reviews")
      .select(
        "id, visited_at, solo_comfort, seat_type, solo_order_available, price_paid, wait_minutes, body, created_at, restaurants(name, status), review_tags(tags(label))",
      )
      .eq("status", "pending")
      .order("created_at")
      .limit(100),
    supabase.rpc("admin_open_reports"),
    supabase
      .from("moderation_actions")
      .select("id, target_type, target_id, action, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  for (const r of [places, reviews, reports, log]) {
    if (r.error) throw new Error(`admin load failed: ${r.error.code}`);
  }
  const counts: Record<Tab, number | null> = {
    places: places.data!.length,
    reviews: reviews.data!.length,
    reports: reports.data!.length,
    log: null,
  };

  return (
    <>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm underline underline-offset-2"
      >
        ← 지도
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">검수</h1>
      <nav
        aria-label="검수 메뉴"
        className="-mx-4 flex gap-2 overflow-x-auto px-4"
      >
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm ${
              tab === key
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {label}
            {counts[key] !== null && ` ${counts[key]}`}
          </Link>
        ))}
      </nav>

      {result && (
        <p
          role="status"
          className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-800"
        >
          {result}
        </p>
      )}

      {tab === "places" && (
        <ul className="space-y-3">
          {places.data!.length === 0 && (
            <li className="text-sm text-zinc-500">대기 중인 장소가 없어요.</li>
          )}
          {places.data!.map((p) => {
            const candidates = candidateSchema.parse(p.candidates);
            return (
              <li
                key={p.id}
                className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <h2 className="font-semibold">{p.name}</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {p.category_label} · {p.address}
                </p>
                <p className="text-xs text-zinc-500">
                  제안 {formatDate(p.created_at)} · 좌표 {p.lat.toFixed(5)},{" "}
                  {p.lng.toFixed(5)}{" "}
                  <Link
                    href={`/?lat=${p.lat.toFixed(5)}&lng=${p.lng.toFixed(5)}&z=18`}
                    className="underline underline-offset-2"
                  >
                    지도에서 위치 보기
                  </Link>
                </p>
                {candidates.length > 0 && (
                  <div className="mt-2 rounded-lg bg-amber-50 p-2 text-sm dark:bg-amber-950/40">
                    <p className="font-medium">중복 의심 후보</p>
                    <ul className="list-disc pl-5">
                      {candidates.map((c) => (
                        <li key={c.id}>
                          {c.name} ({PLACE_STATUS_LABELS[c.status] ?? c.status},{" "}
                          {MATCH_REASON_LABELS[
                            c.reason as keyof typeof MATCH_REASON_LABELS
                          ] ?? c.reason}
                          , {c.distance_m}m)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <ModerationForm
                  tab="places"
                  targetType="restaurant"
                  targetId={p.id}
                  actions={["approve", "reject"]}
                  subject={p.name}
                />
              </li>
            );
          })}
        </ul>
      )}

      {tab === "reviews" && (
        <ul className="space-y-3">
          {reviews.data!.length === 0 && (
            <li className="text-sm text-zinc-500">대기 중인 리뷰가 없어요.</li>
          )}
          {reviews.data!.map((v) => {
            const restaurant = v.restaurants as {
              name: string;
              status: string;
            } | null;
            const tags = (v.review_tags as { tags: { label: string } | null }[])
              .map((t) => t.tags?.label)
              .filter(Boolean);
            const subject = `${restaurant?.name ?? "식당"} 리뷰`;
            return (
              <li
                key={v.id}
                className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <h2 className="font-semibold">
                  {restaurant?.name}
                  {restaurant?.status === "pending" && (
                    <span className="ml-2 text-xs font-normal text-zinc-500">
                      (장소도 검수 대기)
                    </span>
                  )}
                </h2>
                <p className="text-sm">
                  방문 {formatDate(v.visited_at)} · 편안함 {v.solo_comfort}/5 ·{" "}
                  {SEAT_TYPE_LABELS[v.seat_type] ?? v.seat_type}
                  {v.price_paid !== null && ` · ${formatPrice(v.price_paid)}`}
                  {v.wait_minutes !== null && ` · 대기 ${v.wait_minutes}분`}
                </p>
                {tags.length > 0 && (
                  <p className="text-xs text-zinc-500">{tags.join(", ")}</p>
                )}
                {v.body && (
                  <p className="mt-1 whitespace-pre-line text-sm">{v.body}</p>
                )}
                <ModerationForm
                  tab="reviews"
                  targetType="review"
                  targetId={v.id}
                  actions={["approve", "reject", "remove"]}
                  subject={subject}
                />
              </li>
            );
          })}
        </ul>
      )}

      {tab === "reports" && (
        <ul className="space-y-3">
          {reports.data!.length === 0 && (
            <li className="text-sm text-zinc-500">열린 신고가 없어요.</li>
          )}
          {reports.data!.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <h2 className="font-semibold">
                {r.target_type === "review" ? "리뷰" : "식당"} ·{" "}
                {r.target_label ?? "(삭제됨)"}
              </h2>
              <p className="text-sm">
                사유: {REPORT_REASON_LABELS[r.reason] ?? r.reason} · 대상 상태{" "}
                {r.target_status ?? "-"}
              </p>
              {r.note && (
                <p className="mt-1 whitespace-pre-line text-sm">{r.note}</p>
              )}
              <p className="text-xs text-zinc-500">
                접수 {formatDate(r.created_at)}
              </p>
              <ReportResolutionForm
                reportId={r.id}
                targetType={r.target_type}
                subject={r.target_label ?? "대상"}
              />
            </li>
          ))}
        </ul>
      )}

      {tab === "log" && (
        <ul className="space-y-2 text-sm">
          {log.data!.length === 0 && (
            <li className="text-zinc-500">기록이 없어요.</li>
          )}
          {log.data!.map((m) => (
            <li
              key={m.id}
              className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-800"
            >
              {formatDate(m.created_at)} · {m.target_type} {m.action}
              {m.reason && ` — ${m.reason}`}
              <span className="block text-xs text-zinc-500">{m.target_id}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      {/* Nothing identifies the console until the admin check passes (Q31). */}
      <Suspense
        fallback={<p className="text-sm text-zinc-500">불러오는 중이에요…</p>}
      >
        <AdminContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
