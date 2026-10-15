import { resolveReportAction } from "@/app/admin/actions";

/** Resolve or dismiss a report, optionally acting on its target (Q29). */
export function ReportResolutionForm({
  reportId,
  targetType,
  subject,
}: {
  reportId: string;
  targetType: "restaurant" | "review";
  subject: string;
}) {
  return (
    <form action={resolveReportAction} className="mt-3 space-y-2">
      <input type="hidden" name="reportId" value={reportId} />
      <label
        htmlFor={`content-${reportId}`}
        className="block text-sm font-medium"
      >
        대상 조치
      </label>
      <select
        id={`content-${reportId}`}
        name="contentAction"
        defaultValue="none"
        className="h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 text-base dark:border-zinc-700"
      >
        <option value="none">조치 없음</option>
        {targetType === "review" ? (
          <option value="remove_review">리뷰 비공개</option>
        ) : (
          <option value="archive_restaurant">식당 보관 (지도에서 숨김)</option>
        )}
      </select>
      <label
        htmlFor={`report-reason-${reportId}`}
        className="block text-sm font-medium"
      >
        사유{" "}
        <span className="font-normal text-zinc-500">(대상 조치 시 필수)</span>
      </label>
      <textarea
        id={`report-reason-${reportId}`}
        name="reason"
        rows={2}
        maxLength={500}
        className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-base dark:border-zinc-700"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="decision"
          value="resolve"
          aria-label={`${subject} 신고 해결`}
          className="min-h-11 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          해결
        </button>
        <button
          type="submit"
          name="decision"
          value="dismiss"
          aria-label={`${subject} 신고 기각`}
          className="min-h-11 rounded-lg border border-zinc-300 px-4 text-sm dark:border-zinc-700"
        >
          기각
        </button>
      </div>
    </form>
  );
}
