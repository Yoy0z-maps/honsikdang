"use client";

import { useActionState, useId } from "react";
import { deleteAccount, type DeleteAccountState } from "@/app/auth/actions";

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<DeleteAccountState, FormData>(
    deleteAccount,
    { status: "idle" },
  );
  const id = useId();
  return (
    <form action={action} className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        계속하려면 &lsquo;삭제&rsquo;라고 입력해 주세요
      </label>
      <input
        id={id}
        name="confirm"
        autoComplete="off"
        className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
      />
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-11 w-full items-center justify-center rounded-lg bg-red-700 px-4 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "삭제하는 중…" : "계정 삭제"}
      </button>
    </form>
  );
}
