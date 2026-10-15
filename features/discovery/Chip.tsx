import type { ReactNode } from "react";

export function toggleSlug(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

/** 44 px tall toggle chip (master plan §5A touch targets). */
export function Chip({
  pressed,
  onClick,
  children,
  label,
}: {
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className={`flex min-h-11 shrink-0 items-center gap-1 rounded-full border px-4 text-sm shadow-sm ${
        pressed
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}
