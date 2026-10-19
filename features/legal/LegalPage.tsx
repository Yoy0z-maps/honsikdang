import Link from "next/link";
import type { ReactNode } from "react";

export const LEGAL_CONTACT = {
  name: "운영자",
  email: "work.johnhan@gmail.com",
} as const;

/** Effective date shown on both documents; update when they change. */
export const LEGAL_EFFECTIVE_DATE = "2026년 10월 19일";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 text-sm leading-relaxed">
      <nav className="flex gap-4">
        <Link
          href="/"
          className="-ml-2 inline-flex min-h-11 items-center px-2 underline underline-offset-2"
        >
          ← 지도
        </Link>
      </nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          시행일: {LEGAL_EFFECTIVE_DATE}
        </p>
      </header>
      {children}
    </main>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Phones get one card per row (every column visible, no sideways scroll);
 * wider screens get a table. Screenshot review: a scrolling table hid the
 * retention and country columns at 360 px.
 */
export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <>
      <ul className="space-y-2 sm:hidden">
        {rows.map((row, i) => (
          <li
            key={i}
            className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <dl className="space-y-1">
              {row.map((cell, j) => (
                <div key={j}>
                  <dt className="text-xs text-zinc-500">{head[j]}</dt>
                  <dd>{cell}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <table className="hidden w-full border-collapse text-left sm:table">
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                scope="col"
                className="border-b border-zinc-300 p-2 font-semibold dark:border-zinc-700"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="align-top">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="border-b border-zinc-200 p-2 dark:border-zinc-800"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
