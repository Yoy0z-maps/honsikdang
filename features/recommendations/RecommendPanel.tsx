"use client";

import Link from "next/link";
import { useState } from "react";
import { Chip, toggleSlug } from "@/features/discovery/Chip";
import { BUDGET_OPTIONS } from "@/lib/domain/filters";
import { formatPrice } from "@/lib/domain/format";
import {
  MOOD_LABELS,
  WEIGHTS,
  type Mood,
  type RecommendInput,
  type Recommendation,
} from "@/lib/domain/recommend";
import type { Catalogue } from "@/lib/restaurants/search";

export type RecommendState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; result: Recommendation; capped: boolean };

const MOODS = Object.keys(MOOD_LABELS) as Mood[];

/**
 * "오늘 뭐 먹지?" inside the bottom sheet (decisions Q56–Q61). Inputs are
 * chips only; the area is the visible map. Results are numbered like the
 * map markers.
 */
export function RecommendPanel({
  catalogue,
  state,
  onRecommend,
  onMore,
  onPass,
  onLocate,
  onClose,
}: {
  catalogue: Catalogue | null;
  state: RecommendState;
  onRecommend: (input: RecommendInput) => void;
  /** "다른 추천 보기": hide all shown picks. */
  onMore: () => void;
  /** "패스": hide one pick and fill its place. */
  onPass: (id: string) => void;
  onLocate: (id: string) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState<RecommendInput>({
    budget: null,
    include: [],
    exclude: [],
    moods: [],
  });
  // After a run the form folds into a one-line summary so the picks come
  // first (screenshot review: they were below the fold).
  const [editing, setEditing] = useState(true);
  const label = (slug: string) =>
    catalogue?.categories.find((c) => c.slug === slug)?.label ?? slug;
  const conditions = [
    ...input.moods.map((m) => MOOD_LABELS[m]),
    ...(input.budget !== null ? [`${formatPrice(input.budget)} 이하`] : []),
    ...input.include.map(label),
    ...input.exclude.map((s) => `${label(s)} 빼고`),
  ];
  const chosenKinds = input.include.length + input.exclude.length;

  return (
    <div className="space-y-4">
      {!editing && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-zinc-100 p-2 text-sm dark:bg-zinc-800">
          <p className="min-w-0">
            {conditions.length > 0 ? conditions.join(" · ") : "조건 없이"}{" "}
            <span className="text-zinc-500">· 지금 보이는 지도</span>
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-h-11 shrink-0 px-1 underline underline-offset-2"
          >
            조건 바꾸기
          </button>
        </div>
      )}
      <form
        aria-label="추천 조건"
        hidden={!editing}
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onRecommend(input);
          setEditing(false);
        }}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          지금 보이는 지도 안에서 골라요. 모두 선택 사항이에요.
        </p>
        <fieldset>
          <legend className="text-sm font-medium">기분</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {MOODS.map((mood) => (
              <Chip
                key={mood}
                pressed={input.moods.includes(mood)}
                onClick={() =>
                  setInput((v) => ({
                    ...v,
                    moods: toggleSlug(v.moods, mood) as Mood[],
                  }))
                }
              >
                {MOOD_LABELS[mood]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium">1인 예산 (이하)</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map((p) => (
              <Chip
                key={p}
                label={`${formatPrice(p)} 이하`}
                pressed={input.budget === p}
                onClick={() =>
                  setInput((v) => ({ ...v, budget: v.budget === p ? null : p }))
                }
              >
                {shortWon(p)}
              </Chip>
            ))}
          </div>
        </fieldset>
        {catalogue && (
          <details open={chosenKinds > 0}>
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium underline underline-offset-2">
              음식 종류 고르기 (선택
              {chosenKinds > 0 ? `, ${chosenKinds}개 고름` : ""})
            </summary>
            <fieldset>
              <legend className="text-sm font-medium">먹고 싶은 종류</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {catalogue.categories.map((c) => (
                  <Chip
                    key={c.slug}
                    pressed={input.include.includes(c.slug)}
                    onClick={() =>
                      setInput((v) => ({
                        ...v,
                        include: toggleSlug(v.include, c.slug),
                        exclude: v.exclude.filter((s) => s !== c.slug),
                      }))
                    }
                  >
                    {c.label}
                  </Chip>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium">오늘은 빼고</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {catalogue.categories.map((c) => (
                  <Chip
                    key={c.slug}
                    label={`${c.label} 빼기`}
                    pressed={input.exclude.includes(c.slug)}
                    onClick={() =>
                      setInput((v) => ({
                        ...v,
                        exclude: toggleSlug(v.exclude, c.slug),
                        include: v.include.filter((s) => s !== c.slug),
                      }))
                    }
                  >
                    {c.label}
                  </Chip>
                ))}
              </div>
            </fieldset>
          </details>
        )}
        <button
          type="submit"
          disabled={state.status === "loading"}
          className="flex min-h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {state.status === "loading" ? "고르는 중…" : "3곳 추천 받기"}
        </button>
      </form>

      <section aria-labelledby="rec-results" aria-live="polite">
        <h3 id="rec-results" className="sr-only">
          추천 결과
        </h3>
        {state.status === "error" && (
          <p role="alert" className="text-sm text-red-700">
            추천을 불러오지 못했어요. 다시 시도해 주세요.
          </p>
        )}
        {state.status === "ready" && (
          <RecommendResults
            state={state}
            onMore={onMore}
            onPass={onPass}
            onLocate={onLocate}
          />
        )}
      </section>

      <details className="text-sm text-zinc-600 dark:text-zinc-400">
        <summary className="inline-flex min-h-11 cursor-pointer items-center underline underline-offset-2">
          추천 기준
        </summary>
        <p className="mt-1">
          혼밥 편안함 {Math.round(WEIGHTS.comfort * 100)}% (리뷰가 적으면 보통
          점수 쪽으로 보정), 거리 {Math.round(WEIGHTS.distance * 100)}%, 최근
          방문 {Math.round(WEIGHTS.recency * 100)}%, 기분과 맞는 특성{" "}
          {Math.round(WEIGHTS.match * 100)}%. 가능하면 서로 다른 종류로 고르고,
          리뷰가 없는 곳과 가격 정보가 없는 곳은 각각 한 곳까지만 넣어요.
          영업시간·혼잡도는 알 수 없어 반영하지 않아요. 추천 결과는 저장하지
          않아요.
        </p>
      </details>

      <button
        type="button"
        onClick={onClose}
        className="min-h-11 text-sm underline underline-offset-2"
      >
        결과 목록으로 돌아가기
      </button>
    </div>
  );
}

function RecommendResults({
  state,
  onMore,
  onPass,
  onLocate,
}: {
  state: Extract<RecommendState, { status: "ready" }>;
  onMore: () => void;
  onPass: (id: string) => void;
  onLocate: (id: string) => void;
}) {
  const { result, capped } = state;
  return (
    <div className="space-y-2">
      {result.shortfall && (
        <p
          data-testid="rec-shortfall"
          className="rounded-lg bg-zinc-100 p-2 text-sm dark:bg-zinc-800"
        >
          {result.shortfall}
        </p>
      )}
      {capped && (
        <p className="text-xs text-zinc-500">
          식당이 많아 지도 중심에서 가까운 50곳 안에서 골랐어요.
        </p>
      )}
      <ol className="space-y-2">
        {result.picks.map((pick, index) => {
          const r = pick.candidate;
          return (
            <li
              key={r.id}
              data-testid="rec-pick"
              className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-600 text-sm font-bold text-white"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold">
                    <Link
                      href={`/restaurants/${r.id}`}
                      className="inline-flex min-h-11 items-center underline-offset-2 hover:underline"
                    >
                      <span className="sr-only">{index + 1}번 추천: </span>
                      {r.name}
                    </Link>
                  </h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {r.categoryLabel}
                    {pick.badges.includes("new") && (
                      <span className="ml-1 rounded-full bg-emerald-100 px-2 text-xs text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
                        새로 발견
                      </span>
                    )}
                    {pick.badges.includes("no_price") && (
                      <span className="ml-1 rounded-full bg-zinc-100 px-2 text-xs dark:bg-zinc-800">
                        가격 정보 없음
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <ul
                aria-label="추천 이유"
                className="mt-1 list-disc space-y-0.5 pl-9 text-sm"
              >
                {pick.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2 pl-9">
                <button
                  type="button"
                  onClick={() => onLocate(r.id)}
                  aria-label={`${r.name} 지도에서 보기`}
                  className="min-h-11 rounded-lg border border-zinc-300 px-3 text-sm dark:border-zinc-700"
                >
                  지도
                </button>
                <button
                  type="button"
                  onClick={() => onPass(r.id)}
                  aria-label={`${r.name} 패스하고 다른 곳 보기`}
                  className="min-h-11 rounded-lg border border-zinc-300 px-3 text-sm dark:border-zinc-700"
                >
                  패스
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      {result.picks.length > 0 && (
        <button
          type="button"
          onClick={onMore}
          className="min-h-11 w-full rounded-lg border border-zinc-300 px-4 text-sm dark:border-zinc-700"
        >
          다른 추천 보기
        </button>
      )}
    </div>
  );
}

/** Compact chip text: 7000 → "7천 원", 15000 → "1만 5천 원". */
export function shortWon(krw: number): string {
  const man = Math.floor(krw / 10000);
  const cheon = Math.floor((krw % 10000) / 1000);
  return [man ? `${man}만` : "", cheon ? `${cheon}천` : ""]
    .filter(Boolean)
    .join(" ")
    .concat(" 원");
}
