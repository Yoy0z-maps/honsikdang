import { Suspense } from "react";
import { DiscoveryView } from "@/features/discovery/DiscoveryView";

export default function Home() {
  return (
    <>
      <h1 className="sr-only">혼식당 — 혼자 먹기 편한 식당 지도</h1>
      {/* DiscoveryView reads search params, which are only known at request
          time. The fallback keeps the map-first shape (no list-first flash). */}
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="flex h-dvh items-center justify-center bg-zinc-200 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
          >
            지도를 준비하는 중이에요…
          </div>
        }
      >
        <DiscoveryView />
      </Suspense>
    </>
  );
}
