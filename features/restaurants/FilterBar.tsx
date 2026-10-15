"use client";

import { useState, type FormEvent } from "react";
import {
  BUDGET_OPTIONS,
  MAX_QUERY_LENGTH,
  RADIUS_OPTIONS,
  type DiscoveryFilters,
} from "@/lib/domain/filters";
import { formatDistance, formatPrice } from "@/lib/domain/format";
import type { Catalogue } from "@/lib/restaurants/search";

type Props = {
  filters: DiscoveryFilters;
  catalogue: Catalogue | null;
  catalogueFailed: boolean;
  onChange: (patch: Partial<DiscoveryFilters>) => void;
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
        pressed
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-300 dark:border-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

export function FilterBar({
  filters,
  catalogue,
  catalogueFailed,
  onChange,
}: Props) {
  // Keyed by the committed query so the input resets when the URL changes.
  const [draft, setDraft] = useState({
    committed: filters.query,
    value: filters.query,
  });
  const query = draft.committed === filters.query ? draft.value : filters.query;

  function submit(event: FormEvent) {
    event.preventDefault();
    onChange({ query: query.trim() });
  }

  return (
    <div className="space-y-2">
      <form role="search" onSubmit={submit} className="flex gap-2">
        <label htmlFor="restaurant-query" className="sr-only">
          식당 이름 또는 주소 검색
        </label>
        <input
          id="restaurant-query"
          type="search"
          value={query}
          maxLength={MAX_QUERY_LENGTH}
          placeholder="식당 이름 또는 주소"
          onChange={(e) =>
            setDraft({ committed: filters.query, value: e.target.value })
          }
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          검색
        </button>
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        <label className="flex items-center gap-1">
          <span>반경</span>
          <select
            value={filters.radius}
            onChange={(e) => onChange({ radius: Number(e.target.value) })}
            className="rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700"
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {formatDistance(r)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span>1인 예산</span>
          <select
            value={filters.maxPrice ?? ""}
            onChange={(e) =>
              onChange({
                maxPrice: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700"
          >
            <option value="">제한 없음</option>
            {BUDGET_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {formatPrice(p)} 이하
              </option>
            ))}
          </select>
        </label>
      </div>

      {catalogueFailed && (
        <p role="alert" className="text-sm text-red-700">
          필터 목록을 불러오지 못했어요.
        </p>
      )}
      {catalogue && (
        <>
          <div
            role="group"
            aria-label="음식 종류"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
          >
            {catalogue.categories.map((c) => (
              <Chip
                key={c.slug}
                pressed={filters.categories.includes(c.slug)}
                onClick={() =>
                  onChange({ categories: toggle(filters.categories, c.slug) })
                }
              >
                {c.label}
              </Chip>
            ))}
          </div>
          <div
            role="group"
            aria-label="혼밥 특성 (모두 만족)"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
          >
            {catalogue.tags.map((t) => (
              <Chip
                key={t.slug}
                pressed={filters.tags.includes(t.slug)}
                onClick={() => onChange({ tags: toggle(filters.tags, t.slug) })}
              >
                {t.label}
              </Chip>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
