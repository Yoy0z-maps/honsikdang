"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "@/app/auth/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    sendMagicLink,
    { status: "idle" },
  );

  if (state.status === "sent") {
    return (
      <div role="status" className="space-y-1 text-sm">
        <p className="font-medium">로그인 링크를 보냈어요.</p>
        <p className="text-zinc-600 dark:text-zinc-400">
          {state.email} 메일함에서 링크를 눌러 주세요. 링크는 1시간 동안 한 번만
          쓸 수 있어요.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1">
        <label htmlFor="login-email" className="block text-sm font-medium">
          이메일
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          aria-describedby={
            state.status === "error" ? "login-error" : undefined
          }
          className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>
      {state.status === "error" && (
        <p id="login-error" role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "보내는 중…" : "로그인 링크 받기"}
      </button>
    </form>
  );
}
