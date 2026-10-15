"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/auth/actions";
import { loginPath } from "@/lib/auth/redirect";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Session = "unknown" | "signed-out" | "signed-in";

/**
 * Display only. Authorization always happens on the server and in RLS.
 * `compact` (map overlay): a single 44 px control; sign-out lives on
 * /me/reviews.
 */
export function AccountMenu({ compact = false }: { compact?: boolean }) {
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

  if (session === "unknown")
    return <div className={compact ? "h-11 w-16" : "h-11"} aria-hidden />;

  const linkClass = compact
    ? "flex min-h-11 items-center px-4 text-sm font-medium"
    : "flex min-h-11 items-center rounded-lg border border-zinc-300 px-3 text-sm dark:border-zinc-700";

  if (session === "signed-out") {
    return (
      <Link href={loginPath(pathname)} className={linkClass}>
        로그인
      </Link>
    );
  }

  if (compact) {
    return (
      <Link href="/me/reviews" className={linkClass}>
        내 리뷰
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Link href="/me/reviews" className={linkClass}>
        내 리뷰
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="min-h-11 px-2 underline underline-offset-2"
        >
          로그아웃
        </button>
      </form>
    </div>
  );
}
