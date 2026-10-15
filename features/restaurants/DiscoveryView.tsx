"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NaverMap } from "@/features/map/NaverMap";
import {
  filtersToSearchParams,
  parseFilters,
  type DiscoveryFilters,
} from "@/lib/domain/filters";
import {
  approxDistanceMeters,
  roundLatLng,
  type LatLng,
} from "@/lib/domain/geo";
import { getNaverMapKeyId } from "@/lib/env";
import {
  fetchCatalogue,
  searchRestaurants,
  type Catalogue,
  type SearchPage,
} from "@/lib/restaurants/search";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { FilterBar } from "./FilterBar";
import { ResultList, type ResultState } from "./ResultList";

type Loaded =
  | {
      key: string;
      kind: "ready";
      page: SearchPage;
      loadingMore: boolean;
      loadMoreFailed: boolean;
    }
  | { key: string; kind: "error" };

const MOVED_THRESHOLD_M = 100;

export function DiscoveryView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramsString = searchParams.toString();
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(paramsString)),
    [paramsString],
  );

  const [retry, setRetry] = useState(0);
  const resultKey = `${paramsString}#${retry}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [catalogueFailed, setCatalogueFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const mapKeyId = getNaverMapKeyId();

  // Client creation can throw (e.g. misconfigured env). Starting inside a
  // promise turns that into a rejection, i.e. an error state, not a crash.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => fetchCatalogue(getBrowserSupabase()))
      .then((data) => !cancelled && setCatalogue(data))
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("catalogue fetch failed", error);
        setCatalogueFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => searchRestaurants(getBrowserSupabase(), filters, 0))
      .then((page) => {
        if (cancelled) return;
        setLoaded({
          key: resultKey,
          kind: "ready",
          page,
          loadingMore: false,
          loadMoreFailed: false,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("search_restaurants failed", error);
        setLoaded({ key: resultKey, kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [filters, resultKey]);

  const current = loaded && loaded.key === resultKey ? loaded : null;
  const state: ResultState = !current
    ? { status: "loading" }
    : current.kind === "error"
      ? { status: "error" }
      : {
          status: "ready",
          items: current.page.items,
          total: current.page.total,
          excludedNoPrice: current.page.excludedNoPrice,
          loadingMore: current.loadingMore,
          loadMoreFailed: current.loadMoreFailed,
        };
  const items = state.status === "ready" ? state.items : [];

  const updateFilters = useCallback(
    (patch: Partial<DiscoveryFilters>) => {
      const next = filtersToSearchParams({ ...filters, ...patch }).toString();
      setSelectedId(null);
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    },
    [filters, pathname, router],
  );

  async function loadMore() {
    if (!current || current.kind !== "ready") return;
    const key = current.key;
    setLoaded({ ...current, loadingMore: true, loadMoreFailed: false });
    try {
      const next = await searchRestaurants(
        getBrowserSupabase(),
        filters,
        current.page.items.length,
      );
      setLoaded((prev) =>
        prev && prev.key === key && prev.kind === "ready"
          ? {
              ...prev,
              loadingMore: false,
              page: {
                ...next,
                items: [...prev.page.items, ...next.items],
              },
            }
          : prev,
      );
    } catch (error) {
      console.error("search_restaurants (more) failed", error);
      setLoaded((prev) =>
        prev && prev.key === key && prev.kind === "ready"
          ? { ...prev, loadingMore: false, loadMoreFailed: true }
          : prev,
      );
    }
  }

  function selectFromMap(id: string) {
    setSelectedId(id);
    document
      .getElementById(`restaurant-${id}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationMessage(
        "이 브라우저는 위치 확인을 지원하지 않아요. 지도를 움직여 지역을 선택해 주세요.",
      );
      return;
    }
    setLocationMessage("현재 위치를 확인하는 중이에요…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Used only as the search center; never stored.
        setLocationMessage(null);
        updateFilters({
          center: roundLatLng({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        });
      },
      (error) => {
        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? "위치 권한이 거부되었어요. 지도를 움직여 지역을 직접 선택해 주세요."
            : "현재 위치를 확인할 수 없어요. 지도를 움직여 지역을 선택해 주세요.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const mapMoved =
    mapCenter !== null &&
    approxDistanceMeters(mapCenter, filters.center) > MOVED_THRESHOLD_M;
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.tags.length > 0 ||
    filters.maxPrice !== null ||
    filters.query !== "";

  return (
    <div className="flex min-h-dvh flex-col md:h-dvh md:flex-row">
      <div className="relative h-[40vh] shrink-0 md:h-full md:flex-1">
        <NaverMap
          keyId={mapKeyId}
          center={filters.center}
          markers={items.map((item) => ({
            id: item.id,
            position: item.position,
          }))}
          selectedId={selectedId}
          onSelect={selectFromMap}
          onCenterIdle={setMapCenter}
        />
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center gap-2">
          {mapMoved && mapCenter && (
            <button
              type="button"
              onClick={() => updateFilters({ center: roundLatLng(mapCenter) })}
              className="pointer-events-auto rounded-full bg-white px-4 py-2 text-sm font-medium shadow-md dark:bg-zinc-800"
            >
              이 지역에서 검색
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={useCurrentLocation}
          className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-2 text-sm shadow-md dark:bg-zinc-800"
        >
          현재 위치
        </button>
      </div>

      <div className="flex-1 space-y-4 p-4 md:w-[420px] md:flex-none md:overflow-y-auto">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">혼식당</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            혼자 먹기 편한 식당을 찾아보세요.
          </p>
        </header>
        <FilterBar
          filters={filters}
          catalogue={catalogue}
          catalogueFailed={catalogueFailed}
          onChange={updateFilters}
        />
        {locationMessage && (
          <p role="status" className="text-sm text-zinc-700 dark:text-zinc-300">
            {locationMessage}
          </p>
        )}
        <ResultList
          state={state}
          selectedId={selectedId}
          hasActiveFilters={hasActiveFilters}
          showTagCount={filters.tags.length > 0}
          onRetry={() => setRetry((n) => n + 1)}
          onLoadMore={loadMore}
          onResetFilters={() =>
            updateFilters({
              categories: [],
              tags: [],
              maxPrice: null,
              query: "",
            })
          }
          onFocusItem={setSelectedId}
        />
      </div>
    </div>
  );
}
