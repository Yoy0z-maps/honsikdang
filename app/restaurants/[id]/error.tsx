"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function RestaurantError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // In production only the digest reaches the client; match it in server logs.
    console.error("restaurant detail failed", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-2 px-4 py-6" role="alert">
      <h1 className="text-xl font-bold">식당 정보를 불러오지 못했어요</h1>
      <div className="flex gap-3 text-sm">
        <button
          type="button"
          onClick={() => retry()}
          className="underline underline-offset-2"
        >
          다시 시도
        </button>
        <Link href="/" className="underline underline-offset-2">
          목록으로
        </Link>
      </div>
    </main>
  );
}
