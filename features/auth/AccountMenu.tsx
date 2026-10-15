"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/auth/actions";
import { loginPath } from "@/lib/auth/redirect";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Session = "unknown" | "signed-out" | "signed-in";

/** Display only. Authorization always happens on the server and in RLS. */
export function AccountMenu() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session>("unknown");

  useEffect(() => {
    let supabase;
    try {
      supabase = getBrowserSupabase();
    } catch {
      return;
    }
    let cancelled = false;
    supabase.auth.getClaims().then(({ data }) => {
      if (!cancelled) setSession(data?.claims ? "signed-in" : "signed-out");
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ? "signed-in" : "signed-out");
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  if (session === "unknown") return <div className="h-8" aria-hidden />;

  if (session === "signed-out") {
    return (
      <Link
        href={loginPath(pathname)}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
      >
        로그인
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        href="/me/reviews"
        className="rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
      >
        내 리뷰
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="px-2 py-1.5 underline underline-offset-2"
        >
          로그아웃
        </button>
      </form>
    </div>
  );
}
