"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth/redirect";
import { createUserServerSupabase } from "@/lib/supabase/server";

export type LoginState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

const emailSchema = z.email().max(254);

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  // Supabase Auth only redirects to URLs on its allow-list, so a spoofed
  // Host header cannot turn this into an open redirect.
  return `${proto}://${host}`;
}

export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = emailSchema.safeParse(
    String(formData.get("email") ?? "").trim(),
  );
  if (!email.success) {
    return { status: "error", message: "올바른 이메일 주소를 입력해 주세요." };
  }
  const next = safeNextPath(String(formData.get("next") ?? "/"));

  const supabase = await createUserServerSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      emailRedirectTo: `${await requestOrigin()}/auth/confirm?next=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("signInWithOtp failed", error.status, error.code);
    return {
      status: "error",
      message:
        error.status === 429
          ? "요청이 너무 많아요. 잠시 후 다시 시도해 주세요."
          : "로그인 링크를 보내지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
  return { status: "sent", email: email.data };
}

export async function signOut(): Promise<void> {
  const supabase = await createUserServerSupabase();
  await supabase.auth.signOut();
  redirect("/");
}

export type DeleteAccountState = { status: "idle" | "error"; message?: string };

/**
 * Deletes the signed-in account (decision C-73). Reviews stay as anonymous
 * content; everything personal is removed by the database cascade.
 */
export async function deleteAccount(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  if (String(formData.get("confirm") ?? "").trim() !== "삭제") {
    return {
      status: "error",
      message: "확인을 위해 '삭제'라고 입력해 주세요.",
    };
  }
  const supabase = await createUserServerSupabase();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    console.error("delete_my_account failed", error.code);
    return {
      status: "error",
      message: "계정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
  // The user no longer exists; clear this browser's session cookies.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/account-deleted");
}
