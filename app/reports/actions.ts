"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { loginPath } from "@/lib/auth/redirect";
import {
  createUserServerSupabase,
  getVerifiedUserId,
} from "@/lib/supabase/server";

export type ReportState =
  | { status: "idle" }
  | { status: "done" }
  | { status: "error"; message: string };

const REASONS = [
  "incorrect_info",
  "closed",
  "duplicate",
  "inappropriate",
  "spam",
  "other",
] as const;

const reportSchema = z.object({
  targetType: z.enum(["restaurant", "review"]),
  targetId: z.string().uuid(),
  reason: z.enum(REASONS, { message: "신고 사유를 골라 주세요." }),
  note: z
    .string()
    .trim()
    .max(500, "메모는 500자 이내로 적어 주세요.")
    .transform((v) => (v === "" ? null : v)),
  returnTo: z.string().regex(/^\/restaurants\/[0-9a-f-]{36}$/),
});

export async function submitReport(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const parsed = reportSchema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    reason: formData.get("reason") ?? "",
    note: String(formData.get("note") ?? ""),
    returnTo: formData.get("returnTo"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
    };
  }
  const input = parsed.data;

  const supabase = await createUserServerSupabase();
  if (!(await getVerifiedUserId(supabase))) redirect(loginPath(input.returnTo));

  // RLS: reporter_id defaults to the caller, status to 'open'; a trigger
  // checks the target is visible and enforces the daily limit (Q16).
  const { error } = await supabase.from("restaurant_reports").insert({
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    note: input.note,
  });
  if (!error) return { status: "done" };

  console.error("report insert failed", error.code);
  const message =
    error.code === "23505"
      ? "이미 신고했어요. 운영자가 확인 중이에요."
      : error.code === "HS429"
        ? "하루에 할 수 있는 신고 수(20건)를 넘었어요."
        : error.code === "23503"
          ? "신고할 대상을 찾을 수 없어요."
          : "신고를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.";
  return { status: "error", message };
}
