"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  createUserServerSupabase,
  getVerifiedUserId,
} from "@/lib/supabase/server";

const TABS = ["places", "reviews", "reports", "log"] as const;

function back(tab: string, result: string): never {
  const safeTab = (TABS as readonly string[]).includes(tab) ? tab : "places";
  redirect(`/admin?tab=${safeTab}&result=${encodeURIComponent(result)}`);
}

function resultFor(code: string | undefined): string {
  switch (code) {
    case "HS409":
      return "conflict";
    case "22023":
      return "reason-required";
    case "P0002":
      return "not-found";
    case "42501":
      return "forbidden";
    default:
      return "error";
  }
}

async function requireSignedIn() {
  const supabase = await createUserServerSupabase();
  // Non-admins get 404 from the page; the RPCs re-check the role anyway.
  if (!(await getVerifiedUserId(supabase))) notFound();
  return supabase;
}

const moderateSchema = z.object({
  tab: z.string(),
  targetType: z.enum(["restaurant", "review"]),
  targetId: z.string().uuid(),
  action: z.enum(["approve", "reject", "archive", "remove", "restore"]),
  reason: z.string().max(500),
});

export async function moderateAction(formData: FormData): Promise<void> {
  const parsed = moderateSchema.safeParse({
    tab: String(formData.get("tab") ?? "places"),
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    action: formData.get("action"),
    reason: String(formData.get("reason") ?? ""),
  });
  if (!parsed.success) back(String(formData.get("tab") ?? ""), "invalid");
  const input = parsed.data;

  const supabase = await requireSignedIn();
  const { error } = await supabase.rpc("moderate", {
    target_type: input.targetType,
    target_id: input.targetId,
    action: input.action,
    reason: input.reason.trim() || undefined,
  });
  if (error) console.error("moderate failed", error.code);
  back(input.tab, error ? resultFor(error.code) : `done-${input.action}`);
}

const resolveSchema = z.object({
  reportId: z.string().uuid(),
  decision: z.enum(["resolve", "dismiss"]),
  contentAction: z.enum(["none", "remove_review", "archive_restaurant"]),
  reason: z.string().max(500),
});

export async function resolveReportAction(formData: FormData): Promise<void> {
  const parsed = resolveSchema.safeParse({
    reportId: formData.get("reportId"),
    decision: formData.get("decision"),
    contentAction: formData.get("contentAction") ?? "none",
    reason: String(formData.get("reason") ?? ""),
  });
  if (!parsed.success) back("reports", "invalid");
  const input = parsed.data;

  const supabase = await requireSignedIn();
  const { error } = await supabase.rpc("resolve_report", {
    report_id: input.reportId,
    decision: input.decision,
    content_action: input.contentAction,
    reason: input.reason.trim() || undefined,
  });
  if (error) console.error("resolve_report failed", error.code);
  back("reports", error ? resultFor(error.code) : `done-${input.decision}`);
}
