import Link from "next/link";
import type { AiSearchResult, FallbackReason } from "@/app/search/actions";
import type { ParsedQuery } from "@/lib/domain/ai-query";
import { formatPrice } from "@/lib/domain/format";
import type { Catalogue } from "@/lib/restaurants/search";

const FALLBACK_TEXT: Record<FallbackReason, string> = {
  unavailable: "지금은 AI 검색을 쓸 수 없어 입력한 말로 일반 검색했어요.",
  budget: "이번 달 AI 검색 사용량이 다 되어 입력한 말로 일반 검색했어요.",
  timeout: "AI 해석이 늦어져 입력한 말로 일반 검색했어요.",
  invalid_output: "AI가 검색어를 이해하지 못해 입력한 말로 일반 검색했어요.",
  error: "AI 해석에 실패해 입력한 말로 일반 검색했어요.",
};

/** Human-readable conditions; only what the app actually applied. */
export function describeParsed(
  parsed: ParsedQuery,
  catalogue: Catalogue | null,
): string[] {
  const label = (options: Catalogue["categories"] | undefined, slug: string) =>
    options?.find((o) => o.slug === slug)?.label ?? slug;
  return [
    ...parsed.categories.map((s) => label(catalogue?.categories, s)),
    ...(parsed.maxPrice !== null
      ? [`1인 ${formatPrice(parsed.maxPrice)} 이하`]
      : []),
    ...(parsed.radius !== null ? [`${parsed.radius}m 이내`] : []),
    ...parsed.tags.map((s) => label(catalogue?.tags, s)),
    ...(parsed.keyword ? [`이름에 "${parsed.keyword}"`] : []),
  ];
}

export type AiNoticeState = {
  query: string;
  result: Exclude<AiSearchResult, { status: "invalid_query" }>;
};

export function AiSearchNotice({
  state,
  catalogue,
  loginHref,
  onClose,
}: {
  state: AiNoticeState;
  catalogue: Catalogue | null;
  loginHref: string;
  onClose: () => void;
}) {
  const { result } = state;
  return (
    <div
      role="status"
      data-testid="ai-notice"
      className="pointer-events-auto rounded-xl bg-white/95 p-3 text-sm shadow-md dark:bg-zinc-800/95"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          {result.status === "ok" && (
            <OkBody parsed={result.parsed} catalogue={catalogue} />
          )}
          {result.status === "fallback" && (
            <p>{FALLBACK_TEXT[result.reason]}</p>
          )}
          {result.status === "limit" && (
            <p>
              오늘 AI 검색 횟수(30회)를 다 썼어요. 일반 검색은 계속 쓸 수
              있어요.
            </p>
          )}
          {result.status === "login_required" && (
            <p>
              AI 검색은 로그인하면 쓸 수 있어요.{" "}
              <Link
                href={loginHref}
                className="inline-flex min-h-11 items-center font-medium underline underline-offset-2"
              >
                로그인
              </Link>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="AI 검색 안내 닫기"
          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function OkBody({
  parsed,
  catalogue,
}: {
  parsed: ParsedQuery;
  catalogue: Catalogue | null;
}) {
  const applied = describeParsed(parsed, catalogue);
  return (
    <>
      <p className="font-medium">
        {applied.length > 0 || parsed.semantic
          ? "AI가 이렇게 이해했어요"
          : "적용할 조건을 찾지 못했어요"}
      </p>
      {applied.length > 0 && (
        <ul aria-label="적용한 조건" className="flex flex-wrap gap-1">
          {applied.map((text) => (
            <li
              key={text}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-700"
            >
              {text}
            </li>
          ))}
        </ul>
      )}
      {parsed.semantic && (
        <p className="text-zinc-600 dark:text-zinc-300">
          &lsquo;{parsed.semantic}&rsquo;에 가까운 곳부터 보여 줘요.
        </p>
      )}
      {parsed.placeMention && (
        <p className="text-zinc-600 dark:text-zinc-300">
          ‘{parsed.placeMention}’ 위치는 찾지 않아요. 지도를 그 지역으로 옮긴 뒤
          다시 검색해 주세요.
        </p>
      )}
      {parsed.unsupported.length > 0 && (
        <p className="text-zinc-600 dark:text-zinc-300">
          반영하지 못한 조건: {parsed.unsupported.join(", ")}
        </p>
      )}
      <p className="text-xs text-zinc-500">
        조건은 필터에서 바꾸거나 지울 수 있어요.
      </p>
    </>
  );
}
