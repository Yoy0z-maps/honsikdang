"use client";

import { useActionState, useId } from "react";
import { submitReport, type ReportState } from "@/app/reports/actions";

const REASON_LABELS: [string, string][] = [
  ["incorrect_info", "정보가 틀려요"],
  ["closed", "폐업했어요"],
  ["duplicate", "중복된 식당이에요"],
  ["inappropriate", "부적절한 내용이에요"],
  ["spam", "광고·스팸이에요"],
  ["other", "기타"],
];

/**
 * Inline report form (disclosure). Signed-out users are redirected to login
 * by the server action and come back to this page.
 */
export function ReportButton({
  targetType,
  targetId,
  returnTo,
  label,
}: {
  targetType: "restaurant" | "review";
  targetId: string;
  returnTo: string;
  /** Accessible name, e.g. "이 리뷰 신고". */
  label: string;
}) {
  const [state, action, pending] = useActionState<ReportState, FormData>(
    submitReport,
    { status: "idle" },
  );
  const id = useId();

  if (state.status === "done") {
    return (
      <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
        신고를 접수했어요. 운영자가 확인할게요.
      </p>
    );
  }

  return (
    <details className="text-sm">
      <summary
        aria-label={label}
        className="inline-flex min-h-11 cursor-pointer items-center text-zinc-500 underline underline-offset-2"
      >
        신고
      </summary>
      <form
        action={action}
        className="mt-2 space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
      >
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label htmlFor={`${id}-reason`} className="block font-medium">
          신고 사유
        </label>
        <select
          id={`${id}-reason`}
          name="reason"
          required
          defaultValue=""
          className="h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 text-base dark:border-zinc-700"
        >
          <option value="" disabled>
            골라 주세요
          </option>
          {REASON_LABELS.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
        <label htmlFor={`${id}-note`} className="block font-medium">
          메모 (선택)
        </label>
        <textarea
          id={`${id}-note`}
          name="note"
          rows={2}
          maxLength={500}
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-base dark:border-zinc-700"
        />
        {state.status === "error" && (
          <p role="alert" className="text-red-700">
            {state.message}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-lg bg-zinc-900 px-4 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "접수 중…" : "신고하기"}
        </button>
      </form>
    </details>
  );
}
