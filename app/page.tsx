import { Suspense } from "react";
import { DiscoveryView } from "@/features/restaurants/DiscoveryView";

export default function Home() {
  return (
    // DiscoveryView reads search params, which are only known at request
    // time; the fallback is the prerendered shell.
    <Suspense
      fallback={
        <div className="p-4" aria-busy="true">
          <h1 className="text-2xl font-bold tracking-tight">혼식당</h1>
          <p className="text-sm text-zinc-600">불러오는 중이에요…</p>
        </div>
      }
    >
      <DiscoveryView />
    </Suspense>
  );
}
