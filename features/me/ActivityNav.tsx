import Link from "next/link";
import { AccountMenu } from "@/features/auth/AccountMenu";

const TABS = [
  { href: "/me/reviews", label: "리뷰" },
  { href: "/me/places", label: "제안" },
  { href: "/me/saved", label: "저장" },
] as const;

export type ActivityTab = (typeof TABS)[number]["href"];

/** Shared header for the "내 활동" pages (Q36). Tabs are page links. */
export function ActivityNav({ current }: { current: ActivityTab }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="-ml-2 inline-flex min-h-11 items-center px-2 text-sm underline underline-offset-2"
        >
          ← 지도
        </Link>
        <AccountMenu />
      </div>
      <nav aria-label="내 활동">
        <ul className="grid grid-cols-3 rounded-xl bg-zinc-100 p-1 text-sm dark:bg-zinc-800">
          {TABS.map((tab) => {
            const active = tab.href === current;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-center rounded-lg font-medium ${
                    active
                      ? "bg-white shadow-sm dark:bg-zinc-950"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
