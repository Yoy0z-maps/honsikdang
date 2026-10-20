"use client";

import { useState, useTransition } from "react";
import { searchPlaces } from "@/app/places/actions";
import type { PlaceCandidate } from "@/lib/domain/place-search";

const inputClass =
  "h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 text-base dark:border-zinc-700";

/**
 * Search-to-fill (WP-08, C-83): picks a NAVER result and hands it to the
 * form, which fills the fields and moves the pin. Its own <form> so Enter
 * searches instead of submitting the suggestion.
 */
export function PlaceSearch({
  onPick,
}: {
  onPick: (candidate: PlaceCandidate) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceCandidate[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [picked, setPicked] = useState<PlaceCandidate | null>(null);
  const [pending, startTransition] = useTransition();

  function search(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await searchPlaces(query);
      if (result.ok) {
        setResults(result.candidates);
        setMessage(
          result.candidates.length === 0
            ? "검색 결과가 없어요. 아래에 직접 입력해 주세요."
            : null,
        );
      } else {
        setResults(null);
        setMessage(result.message);
      }
    });
  }

  function pick(candidate: PlaceCandidate) {
    setPicked(candidate);
    setResults(null);
    setMessage(null);
    onPick(candidate);
  }

  return (
    <section
      aria-labelledby="place-search-heading"
      className="space-y-2 rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-900"
    >
      <h2 id="place-search-heading" className="font-medium">
        검색으로 빠르게 채우기
      </h2>
      <form role="search" onSubmit={search} className="flex gap-2">
        <input
          type="search"
          aria-label="식당 검색어"
          placeholder="예: 시청 국밥"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={50}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending || query.trim().length < 2}
          className="min-h-11 shrink-0 rounded-lg bg-zinc-900 px-4 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "찾는 중…" : "검색"}
        </button>
      </form>

      <div aria-live="polite" className="space-y-2">
        {message && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
        )}
        {results && results.length > 0 && (
          <ul aria-label="검색 결과" className="space-y-1">
            {results.map((c) => (
              <li key={`${c.name}|${c.address}`}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  className="min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-xs text-zinc-600 dark:text-zinc-400">
                    {c.categoryText && `${c.categoryText} · `}
                    {c.address}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {picked && (
          <p
            role="status"
            className="text-sm text-emerald-800 dark:text-emerald-300"
          >
            ‘{picked.name}’ 정보로 채웠어요.{" "}
            {picked.position
              ? "핀이 식당 위치로 옮겨졌는지 확인해 주세요."
              : "위치는 지도를 움직여 직접 맞춰 주세요."}
          </p>
        )}
        <p className="text-xs text-zinc-500">검색 결과 제공: 네이버</p>
      </div>
    </section>
  );
}
