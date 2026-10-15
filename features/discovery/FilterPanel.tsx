"use client";

import {
  BUDGET_OPTIONS,
  RADIUS_OPTIONS,
  type DiscoveryFilters,
} from "@/lib/domain/filters";
import { formatDistance, formatPrice } from "@/lib/domain/format";
import type { Catalogue } from "@/lib/restaurants/search";
import { Chip, toggleSlug } from "./Chip";

type Props = {
  filters: DiscoveryFilters;
  catalogue: Catalogue | null;
  catalogueFailed: boolean;
  activeCount: number;
  resultSummary: string;
  onChange: (patch: Partial<DiscoveryFilters>) => void;
  onReset: () => void;
  onDone: () => void;
};

const selectClass =
  "h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 text-base dark:border-zinc-700";

/** Filters shown inside the bottom sheet (§5A "bottom-sheet filters"). */
export function FilterPanel({
  filters,
  catalogue,
  catalogueFailed,
  activeCount,
  resultSummary,
  onChange,
  onReset,
  onDone,
}: Props) {
  return (
    <div className="space-y-5 pt-1">
      <div className="space-y-1">
        <label htmlFor="filter-radius" className="block font-medium">
          검색 범위
        </label>
        <select
          id="filter-radius"
          value={filters.radius ?? ""}
          onChange={(e) =>
            onChange({
              radius: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          className={selectClass}
        >
          <option value="">지도에 보이는 영역</option>
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r}>
              지도 중심에서 {formatDistance(r)} 이내
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="filter-budget" className="block font-medium">
          1인 예산
        </label>
        <select
          id="filter-budget"
          value={filters.maxPrice ?? ""}
          onChange={(e) =>
            onChange({
              maxPrice: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          className={selectClass}
        >
          <option value="">제한 없음</option>
          {BUDGET_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {formatPrice(p)} 이하
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500">
          승인된 리뷰의 1인 지출 중앙값 기준이에요. 가격 정보가 없는 식당은
          제외돼요.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="font-medium">혼밥 특성 (모두 만족)</legend>
        {catalogueFailed && (
          <p role="alert" className="text-sm text-red-700">
            필터 목록을 불러오지 못했어요.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {catalogue?.tags.map((t) => (
            <Chip
              key={t.slug}
              pressed={filters.tags.includes(t.slug)}
              onClick={() =>
                onChange({ tags: toggleSlug(filters.tags, t.slug) })
              }
            >
              {t.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onReset}
          disabled={activeCount === 0}
          className="min-h-11 flex-1 rounded-lg border border-zinc-300 px-4 text-sm disabled:opacity-40 dark:border-zinc-700"
        >
          초기화
        </button>
        <button
          type="button"
          onClick={onDone}
          className="min-h-11 flex-[2] rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          결과 보기 · {resultSummary}
        </button>
      </div>
    </div>
  );
}
