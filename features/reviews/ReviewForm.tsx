"use client";

import { useActionState } from "react";
import type { ReviewFormState, ReviewFormValues } from "@/app/reviews/actions";
import { SEAT_TYPE_LABELS } from "@/lib/domain/format";
import { MAX_REVIEW_BODY, SEAT_TYPES } from "@/lib/domain/review";

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
