import { moderateAction } from "@/app/admin/actions";

type Action = "approve" | "reject" | "archive" | "remove" | "restore";

const ACTION_LABELS: Record<Action, string> = {
  approve: "승인",
  reject: "반려",
  archive: "보관",
  remove: "비공개",
  restore: "복원",
};

/** Reason + action buttons; reject/archive/remove require a reason (Q28). */
export function ModerationForm({
  tab,
  targetType,
  targetId,
  actions,
  subject,
}: {
  tab: string;
  targetType: "restaurant" | "review";
  targetId: string;
  actions: Action[];
  /** Used in accessible names, e.g. the restaurant name. */
  subject: string;
}) {
  const fieldId = `reason-${targetId}`;
  return (
    <form action={moderateAction} className="mt-3 space-y-2">
      <input type="hidden" name="tab" value={tab} />
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <label htmlFor={fieldId} className="block text-sm font-medium">
        사유{" "}
        <span className="font-normal text-zinc-500">
          (반려·보관·비공개 시 필수, 작성자에게 보여요)
        </span>
      </label>
      <textarea
        id={fieldId}
        name="reason"
        rows={2}
        maxLength={500}
        className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-base dark:border-zinc-700"
      />
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action}
            type="submit"
            name="action"
            value={action}
            aria-label={`${subject} ${ACTION_LABELS[action]}`}
            className={`min-h-11 rounded-lg px-4 text-sm font-medium ${
              action === "approve" || action === "restore"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-red-300 text-red-800 dark:border-red-800 dark:text-red-300"
            }`}
          >
            {ACTION_LABELS[action]}
          </button>
        ))}
      </div>
    </form>
  );
}
