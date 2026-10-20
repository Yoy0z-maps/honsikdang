"use client";

import { useActionState, useState } from "react";
import type { ReviewFormState, ReviewFormValues } from "@/app/reviews/actions";
import { SEAT_TYPE_LABELS } from "@/lib/domain/format";
import {
  MAX_MENU_ITEMS,
  MAX_MENU_NAME,
  MAX_REVIEW_BODY,
  SEAT_TYPES,
} from "@/lib/domain/review";

type Props = {
  action: (
    state: ReviewFormState,
    formData: FormData,
  ) => Promise<ReviewFormState>;
  tags: { slug: string; label: string }[];
  today: string;
  defaults?: ReviewFormValues;
  submitLabel: string;
};

const COMFORT_LABELS = ["", "불편", "조금 불편", "보통", "편함", "아주 편함"];

const RATING_LABELS = [
  "",
  "별로예요",
  "아쉬워요",
  "보통이에요",
  "좋아요",
  "최고예요",
];

/** ★1–5 as a radio group: arrow keys work, each star is a 44 px target. */
function StarRating({ initial, error }: { initial: string; error?: string }) {
  const [rating, setRating] = useState(Number(initial) || 0);
  return (
    <fieldset
      className="min-w-0 space-y-1"
      aria-describedby={error ? "overallRating-error" : undefined}
    >
      <legend className="font-medium">
        전체 만족도 <span className="text-red-700">*</span>
      </legend>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-3xl leading-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-500"
          >
            <input
              type="radio"
              name="overallRating"
              value={n}
              required
              defaultChecked={rating === n}
              onChange={() => setRating(n)}
              className="sr-only"
              aria-label={`별점 ${n}점 (${RATING_LABELS[n]})`}
            />
            <span
              aria-hidden
              className={
                n <= rating
                  ? "text-amber-500"
                  : "text-zinc-300 dark:text-zinc-600"
              }
            >
              ★
            </span>
          </label>
        ))}
        <span className="ml-2 text-sm text-zinc-600 dark:text-zinc-400">
          {rating
            ? `${rating}점 · ${RATING_LABELS[rating]}`
            : "별을 눌러 주세요"}
        </span>
      </div>
      {error && (
        <p id="overallRating-error" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Optional "메뉴 + 가격" rows, up to 5 (C-86). */
function MenuItems({
  names,
  prices,
  error,
}: {
  names: string[];
  prices: string[];
  error?: string;
}) {
  const [rows, setRows] = useState(() =>
    names.length > 0
      ? names.map((name, i) => ({ key: i, name, price: prices[i] ?? "" }))
      : [{ key: 0, name: "", price: "" }],
  );
  return (
    // min-w-0: fieldsets default to min-width: min-content, which kept the
    // input rows from shrinking and widened the page at 360 px.
    <fieldset
      className="min-w-0 space-y-2"
      aria-describedby={error ? "menuItems-error" : undefined}
    >
      <legend className="font-medium">먹은 메뉴와 가격 (선택)</legend>
      {rows.map((row, i) => (
        <div key={row.key} className="flex items-center gap-2">
          <input
            name="menuName"
            aria-label={`메뉴 ${i + 1} 이름`}
            placeholder="예: 순대국밥"
            maxLength={MAX_MENU_NAME}
            defaultValue={row.name}
            className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
          <input
            name="menuPrice"
            aria-label={`메뉴 ${i + 1} 가격(원)`}
            placeholder="가격(원)"
            inputMode="numeric"
            defaultValue={row.price}
            className="w-28 rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
          {rows.length > 1 && (
            <button
              type="button"
              aria-label={`메뉴 ${i + 1} 지우기`}
              onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl text-zinc-500"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {rows.length < MAX_MENU_ITEMS && (
        <button
          type="button"
          onClick={() =>
            setRows((r) => [
              ...r,
              {
                key: Math.max(...r.map((x) => x.key)) + 1,
                name: "",
                price: "",
              },
            ])
          }
          className="min-h-11 text-sm underline underline-offset-2"
        >
          + 메뉴 추가
        </button>
      )}
      {error && (
        <p id="menuItems-error" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-red-700">
      {message}
    </p>
  );
}

export function ReviewForm({
  action,
  tags,
  today,
  defaults = {},
  submitLabel,
}: Props) {
  const [state, formAction, pending] = useActionState(action, { version: 0 });
  const values = state.values ?? defaults;
  const errors = state.fieldErrors ?? {};
  const value = (key: string) => {
    const v = values[key];
    return typeof v === "string" ? v : "";
  };
  const selectedTags = new Set(Array.isArray(values.tags) ? values.tags : []);
  const describedBy = (key: keyof typeof errors) =>
    errors[key] ? `${key}-error` : undefined;

  return (
    // Remount after each submission so inputs show the returned values.
    <form key={state.version} action={formAction} className="space-y-5">
      {(state.message || Object.keys(errors).length > 0) && (
        <div
          role="alert"
          className="rounded-md border border-red-200 p-3 text-sm text-red-800"
        >
          {state.message ?? "입력값을 확인해 주세요."}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="visitedAt" className="block font-medium">
          방문일 <span className="text-red-700">*</span>
        </label>
        <input
          id="visitedAt"
          name="visitedAt"
          type="date"
          required
          max={today}
          min="2000-01-01"
          defaultValue={value("visitedAt") || today}
          aria-invalid={!!errors.visitedAt}
          aria-describedby={describedBy("visitedAt")}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
        <FieldError id="visitedAt-error" message={errors.visitedAt} />
      </div>

      <StarRating
        initial={value("overallRating")}
        error={errors.overallRating}
      />

      <fieldset
        className="space-y-1"
        aria-describedby={describedBy("soloComfort")}
      >
        <legend className="font-medium">
          혼자 먹기 얼마나 편했나요? <span className="text-red-700">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-100 dark:border-zinc-700 dark:has-[:checked]:bg-zinc-800"
            >
              <input
                type="radio"
                name="soloComfort"
                value={n}
                required
                defaultChecked={value("soloComfort") === String(n)}
              />
              {n} {COMFORT_LABELS[n]}
            </label>
          ))}
        </div>
        <FieldError id="soloComfort-error" message={errors.soloComfort} />
      </fieldset>

      <fieldset
        className="space-y-1"
        aria-describedby={describedBy("seatType")}
      >
        <legend className="font-medium">
          앉은 자리 <span className="text-red-700">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {SEAT_TYPES.map((seat) => (
            <label
              key={seat}
              className="flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-100 dark:border-zinc-700 dark:has-[:checked]:bg-zinc-800"
            >
              <input
                type="radio"
                name="seatType"
                value={seat}
                required
                defaultChecked={value("seatType") === seat}
              />
              {SEAT_TYPE_LABELS[seat]}
            </label>
          ))}
        </div>
        <FieldError id="seatType-error" message={errors.seatType} />
      </fieldset>

      <fieldset className="space-y-1">
        <legend className="font-medium">1인분 주문이 됐나요?</legend>
        <div className="flex flex-wrap gap-3 text-sm">
          {[
            ["yes", "가능"],
            ["no", "불가"],
            ["", "모름"],
          ].map(([v, label]) => (
            <label key={label} className="flex items-center gap-1">
              <input
                type="radio"
                name="soloOrderAvailable"
                value={v}
                defaultChecked={value("soloOrderAvailable") === v}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="pricePaid" className="block font-medium">
            1인 지출(원)
          </label>
          <input
            id="pricePaid"
            name="pricePaid"
            inputMode="numeric"
            placeholder="예: 9000"
            defaultValue={value("pricePaid")}
            aria-invalid={!!errors.pricePaid}
            aria-describedby={describedBy("pricePaid")}
            className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
          <FieldError id="pricePaid-error" message={errors.pricePaid} />
        </div>
        <div className="space-y-1">
          <label htmlFor="waitMinutes" className="block font-medium">
            대기 시간(분)
          </label>
          <input
            id="waitMinutes"
            name="waitMinutes"
            inputMode="numeric"
            placeholder="예: 0"
            defaultValue={value("waitMinutes")}
            aria-invalid={!!errors.waitMinutes}
            aria-describedby={describedBy("waitMinutes")}
            className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
          <FieldError id="waitMinutes-error" message={errors.waitMinutes} />
        </div>
      </div>

      <MenuItems
        names={Array.isArray(values.menuName) ? values.menuName : []}
        prices={Array.isArray(values.menuPrice) ? values.menuPrice : []}
        error={errors.menuItems}
      />

      <fieldset className="space-y-1">
        <legend className="font-medium">해당하는 특성</legend>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <label
              key={tag.slug}
              className="flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1.5 text-sm has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-100 dark:border-zinc-700 dark:has-[:checked]:bg-zinc-800"
            >
              <input
                type="checkbox"
                name="tags"
                value={tag.slug}
                defaultChecked={selectedTags.has(tag.slug)}
              />
              {tag.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="body" className="block font-medium">
          한 줄 후기 (선택)
        </label>
        <textarea
          id="body"
          name="body"
          rows={3}
          maxLength={MAX_REVIEW_BODY}
          defaultValue={value("body")}
          aria-invalid={!!errors.body}
          aria-describedby={describedBy("body")}
          className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
        <FieldError id="body-error" message={errors.body} />
      </div>

      <p className="text-xs text-zinc-500">
        작성한 리뷰는 검수 후 공개돼요. 수정하면 다시 검수를 거쳐요.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "저장 중…" : submitLabel}
      </button>
    </form>
  );
}
