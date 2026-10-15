"use client";

import { useState, type FormEvent } from "react";
import { AccountMenu } from "@/features/auth/AccountMenu";
import { AI_QUERY_MAX_LENGTH } from "@/lib/domain/ai-query";
import { MAX_QUERY_LENGTH, type DiscoveryFilters } from "@/lib/domain/filters";
import type { Catalogue } from "@/lib/restaurants/search";
import { Chip, toggleSlug } from "./Chip";

type Props = {
  filters: DiscoveryFilters;
  catalogue: Catalogue | null;
  activeCount: number;
  onChange: (patch: Partial<DiscoveryFilters>) => void;
  onOpenFilters: () => void;
  onSearchFocus: () => void;
  /** Natural-language search (WP-05a). */
  onAiSearch: (text: string) => void;
  aiPending: boolean;
};

/** Search entry and category chips floating over the map (§5A). */
export function MapTopBar({
  filters,
  catalogue,
  activeCount,
  onChange,
  onOpenFilters,
  onSearchFocus,
  onAiSearch,
  aiPending,
}: Props) {
  const [aiMode, setAiMode] = useState(false);
  const [aiText, setAiText] = useState("");
  // Keyed by the committed query so the input resets when the URL changes.
  const [draft, setDraft] = useState({
    committed: filters.query,
    value: filters.query,
  });
  const query = draft.committed === filters.query ? draft.value : filters.query;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (aiMode) {
      if (aiText.trim().length >= 2 && !aiPending) onAiSearch(aiText.trim());
    } else {
      onChange({ query: query.trim() });
    }
    (document.activeElement as HTMLElement | null)?.blur();
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 space-y-2 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:left-[400px]">
      <div className="pointer-events-auto flex items-center gap-2">
        <form
          role="search"
          onSubmit={submit}
          className="flex min-w-0 flex-1 items-center rounded-full bg-white pl-4 shadow-md dark:bg-zinc-900"
        >
          <button
            type="button"
            aria-pressed={aiMode}
            aria-label="AI로 찾기"
            onClick={() => setAiMode((on) => !on)}
            className={`-ml-2 mr-1 flex h-11 shrink-0 items-center rounded-full px-3 text-xs font-bold ${
              aiMode
                ? "bg-orange-600 text-white"
                : "text-orange-700 dark:text-orange-400"
            }`}
          >
            AI
          </button>
          {aiMode ? (
            <>
              <label htmlFor="ai-query" className="sr-only">
                AI 검색: 원하는 식당을 문장으로 입력
              </label>
              <input
                id="ai-query"
                type="search"
                enterKeyHint="search"
                value={aiText}
                maxLength={AI_QUERY_MAX_LENGTH}
                placeholder="예: 만 원 이하 조용한 라멘집"
                onFocus={onSearchFocus}
                onChange={(e) => setAiText(e.target.value)}
                className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none"
              />
            </>
          ) : (
            <>
              <label htmlFor="restaurant-query" className="sr-only">
                식당 이름 또는 주소 검색
              </label>
              <input
                id="restaurant-query"
                type="search"
                enterKeyHint="search"
                value={query}
                maxLength={MAX_QUERY_LENGTH}
                placeholder="식당 이름·주소 검색"
                onFocus={onSearchFocus}
                onChange={(e) =>
                  setDraft({ committed: filters.query, value: e.target.value })
                }
                className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none"
              />
            </>
          )}
          <button
            type="submit"
            disabled={aiMode && aiPending}
            aria-busy={aiMode && aiPending}
            className="h-11 shrink-0 rounded-full px-4 text-sm font-medium disabled:opacity-60"
          >
            {aiMode && aiPending ? "해석 중…" : "검색"}
          </button>
        </form>
        <div className="shrink-0 rounded-full bg-white shadow-md dark:bg-zinc-900">
          <AccountMenu compact />
        </div>
      </div>

      <div
        role="group"
        aria-label="음식 종류"
        className="pointer-events-auto -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]"
      >
        <Chip
          pressed={activeCount > 0}
          onClick={onOpenFilters}
          label={
            activeCount > 0 ? `필터, ${activeCount}개 적용 중` : "필터 열기"
          }
        >
          필터
          {activeCount > 0 && (
            <span className="rounded-full bg-orange-600 px-1.5 text-xs text-white">
              {activeCount}
            </span>
          )}
        </Chip>
        {catalogue?.categories.map((c) => (
          <Chip
            key={c.slug}
            pressed={filters.categories.includes(c.slug)}
            onClick={() =>
              onChange({ categories: toggleSlug(filters.categories, c.slug) })
            }
          >
            {c.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
