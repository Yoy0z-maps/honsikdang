"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { aiSearch } from "@/app/search/actions";
import { searchByRelevance, type RelevancePage } from "@/app/search/relevance";
import { NaverMap } from "@/features/map/NaverMap";
import type { DistanceOrigin } from "@/features/restaurants/RestaurantCard";
import {
  ResultList,
  resultSummary,
  type ResultState,
} from "@/features/restaurants/ResultList";
import {
  chooseInitialCamera,
  readLastRegion,
  writeLastRegion,
  type Camera,
} from "@/lib/domain/camera";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAX_QUERY_LENGTH,
  activeFilterCount,
  clearFilters,
  filtersToSearchParams,
  hasExplicitCenter,
  parseFilters,
  type DiscoveryFilters,
} from "@/lib/domain/filters";
import {
  approxDistanceMeters,
  roundLatLng,
  viewportBounds,
  type Bounds,
  type LatLng,
} from "@/lib/domain/geo";
import { toFilters } from "@/lib/domain/ai-query";
import { loginPath } from "@/lib/auth/redirect";
import { getNaverMapKeyId } from "@/lib/env";
import {
  fetchCatalogue,
  searchRestaurants,
  type Catalogue,
  type SearchPage,
} from "@/lib/restaurants/search";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { AiSearchNotice, type AiNoticeState } from "./AiSearchNotice";
import { BottomSheet, type SheetSnap } from "./BottomSheet";
import { FilterPanel } from "./FilterPanel";
import {
  RecommendPanel,
  type RecommendState,
} from "@/features/recommendations/RecommendPanel";
import {
  recommend,
  type Candidate,
  type RecommendInput,
} from "@/lib/domain/recommend";
import { fetchCandidates } from "@/lib/recommendations/candidates";
import { MapTopBar } from "./MapTopBar";
import { RestaurantPreview } from "./RestaurantPreview";

type Loaded =
  | {
      key: string;
      kind: "ready";
      page: ResultPage;
      bounds: Bounds;
      areaClamped: boolean;
      loadingMore: boolean;
      loadMoreFailed: boolean;
    }
  | { key: string; kind: "error" };

type ResultPage = SearchPage &
  Partial<Pick<RelevancePage, "ordering" | "reason" | "capped" | "evidence">>;

/**
 * Ordinary searches run in the browser (public RPC). Searches with an AI
 * preference go through the server, which embeds the preference and
 * re-ranks the hard-filtered results (WP-05b).
 */
function fetchResults(
  filters: DiscoveryFilters,
  bounds: Bounds,
  offset: number,
): Promise<ResultPage> {
  if (filters.semantic) {
    return searchByRelevance(
      filtersToSearchParams(filters).toString(),
      bounds,
      offset,
    );
  }
  return searchRestaurants(getBrowserSupabase(), filters, bounds, offset);
}

const MOVED_THRESHOLD_M = 100;
const AT_MY_LOCATION_M = 50;

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function currentPosition(timeout: number): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout, maximumAge: 60_000 },
    );
  });
}

/** Location only if permission was already granted; never prompts. */
async function grantedLocation(): Promise<LatLng | null> {
  try {
    if (!("geolocation" in navigator) || !navigator.permissions) return null;
    const status = await navigator.permissions.query({ name: "geolocation" });
    if (status.state !== "granted") return null;
    return await currentPosition(5_000);
  } catch {
    return null;
  }
}

export function DiscoveryView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramsString = searchParams.toString();
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(paramsString)),
    [paramsString],
  );
  const explicitCenter = hasExplicitCenter(new URLSearchParams(paramsString));

  const mapAreaRef = useRef<HTMLDivElement>(null);
  const [initialCameraDone, setInitialCameraDone] = useState(false);
  const cameraReady = explicitCenter || initialCameraDone;

  const [retry, setRetry] = useState(0);
  const resultKey = `${paramsString}#${retry}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [catalogueFailed, setCatalogueFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapCamera, setMapCamera] = useState<Camera | null>(null);
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<AiNoticeState | null>(null);
  const [aiPending, startAiSearch] = useTransition();
  const [focus, setFocus] = useState<{
    position: LatLng;
    nonce: number;
  } | null>(null);
  const [snap, setSnap] = useState<SheetSnap>("collapsed");
  const [mode, setMode] = useState<"results" | "filters" | "recommend">(
    "results",
  );
  const [recState, setRecState] = useState<RecommendState>({ status: "idle" });
  // Inputs, pool and already-shown ids of the current recommendation; kept
  // in memory only (Q61).
  const recSession = useRef<{
    input: RecommendInput;
    pool: Candidate[];
    capped: boolean;
    seen: Set<string>;
  } | null>(null);
  const mapKeyId = getNaverMapKeyId();

  const replaceFilters = useCallback(
    (next: DiscoveryFilters) => {
      const query = filtersToSearchParams(next).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  const updateFilters = useCallback(
    (patch: Partial<DiscoveryFilters>) => {
      setSelectedId(null);
      replaceFilters({ ...filters, ...patch });
    },
    [filters, replaceFilters],
  );

  // Natural-language search (WP-05a): the server returns conditions, which
  // are applied as ordinary filters; failures fall back to a keyword search.
  const runAiSearch = useCallback(
    (text: string) => {
      setNotice(null);
      setAiNotice(null);
      startAiSearch(async () => {
        let result: Awaited<ReturnType<typeof aiSearch>>;
        try {
          result = await aiSearch(text);
        } catch {
          result = { status: "fallback", reason: "error" };
        }
        if (result.status === "invalid_query") return;
        if (result.status === "ok") {
          setSelectedId(null);
          replaceFilters(toFilters(result.parsed, filters));
        } else if (result.status === "fallback") {
          // Like a successful parse, a new AI search replaces old conditions.
          setSelectedId(null);
          replaceFilters({
            ...clearFilters(filters),
            query: text.slice(0, MAX_QUERY_LENGTH),
          });
        }
        setAiNotice({ query: text, result });
      });
    },
    [filters, replaceFilters],
  );

  // Initial camera (§5A): URL → already-granted location → last region →
  // default. Runs once, only when the URL does not choose a position.
  const initialRun = useRef(false);
  useEffect(() => {
    if (explicitCenter || initialRun.current) return;
    initialRun.current = true;
    let cancelled = false;
    grantedLocation().then((location) => {
      if (cancelled) return;
      const { camera, source } = chooseInitialCamera({
        url: null,
        grantedLocation: location,
        lastRegion: readLastRegion(safeLocalStorage()),
        fallback: { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM },
      });
      if (source === "location") setMyLocation(camera.center);
      const next = {
        ...filters,
        center: roundLatLng(camera.center),
        zoom: camera.zoom,
      };
      if (filtersToSearchParams(next).has("lat")) {
        replaceFilters(next); // becomes an explicit URL position
      } else {
        setInitialCameraDone(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [explicitCenter, filters, replaceFilters]);

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
    if (!cameraReady) return;
    let cancelled = false;
    const rect = mapAreaRef.current?.getBoundingClientRect();
    const { bounds, clamped } = viewportBounds(
      filters.center,
      filters.zoom,
      rect?.width || window.innerWidth,
      rect?.height || window.innerHeight,
    );
    Promise.resolve()
      .then(() => fetchResults(filters, bounds, 0))
      .then((page) => {
        if (cancelled) return;
        setLoaded({
          key: resultKey,
          kind: "ready",
          page,
          bounds,
          areaClamped: clamped && filters.radius === null,
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
  }, [cameraReady, filters, resultKey]);

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
          areaClamped: current.areaClamped,
          loadingMore: current.loadingMore,
          loadMoreFailed: current.loadMoreFailed,
          relevance: filters.semantic
            ? {
                text: filters.semantic,
                applied: current.page.ordering === "relevance",
                capped: current.page.capped ?? false,
                evidence: current.page.evidence ?? {},
              }
            : undefined,
        };
  // Derived from `current` (a stable state object) so markers do not change
  // identity on unrelated re-renders.
  const items = useMemo(
    () => (current?.kind === "ready" ? current.page.items : []),
    [current],
  );
  const recPicks = useMemo(
    () =>
      mode === "recommend" && recState.status === "ready"
        ? recState.result.picks.map((p) => p.candidate)
        : null,
    [mode, recState],
  );
  const markers = useMemo(
    () =>
      recPicks
        ? recPicks.map((c, i) => ({
            id: c.id,
            position: c.position,
            label: String(i + 1),
          }))
        : items.map((item) => ({ id: item.id, position: item.position })),
    [items, recPicks],
  );
  const selected = items.find((item) => item.id === selectedId) ?? null;

  async function loadMore() {
    if (!current || current.kind !== "ready") return;
    const key = current.key;
    setLoaded({ ...current, loadingMore: true, loadMoreFailed: false });
    try {
      const next = await fetchResults(
        filters,
        current.bounds,
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
                evidence: { ...prev.page.evidence, ...next.evidence },
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

  function selectMarker(id: string) {
    setSelectedId(id);
    if (mode === "recommend") return; // keep the numbered picks open
    setMode("results");
    setSnap("collapsed");
  }

  function showRecommendation() {
    const session = recSession.current;
    if (!session) return;
    const today = new Date().toLocaleDateString("sv-SE"); // local YYYY-MM-DD
    setRecState({
      status: "ready",
      result: recommend(session.pool, session.input, today, session.seen),
      capped: session.capped,
    });
  }

  async function runRecommend(input: RecommendInput) {
    setRecState({ status: "loading" });
    setSelectedId(null);
    const rect = mapAreaRef.current?.getBoundingClientRect();
    const { bounds } = viewportBounds(
      filters.center,
      filters.zoom,
      rect?.width || window.innerWidth,
      rect?.height || window.innerHeight,
    );
    try {
      const { candidates, capped } = await fetchCandidates(
        getBrowserSupabase(),
        filters,
        bounds,
        input,
      );
      recSession.current = { input, pool: candidates, capped, seen: new Set() };
      showRecommendation();
    } catch (error) {
      console.error("recommendation candidates failed", error);
      setRecState({ status: "error" });
    }
  }

  function hideFromRecommendation(ids: string[]) {
    const session = recSession.current;
    if (!session) return;
    for (const id of ids) session.seen.add(id);
    setSelectedId(null);
    showRecommendation();
  }

  function locate(id: string) {
    const pick = recPicks?.find((c) => c.id === id);
    if (pick) {
      setSelectedId(id);
      setFocus({ position: pick.position, nonce: Date.now() });
      setSnap("collapsed");
      return;
    }
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setSelectedId(id);
    setFocus({ position: item.position, nonce: Date.now() });
    setSnap("collapsed");
  }

  function searchThisArea() {
    if (!mapCamera) return;
    const camera = {
      center: roundLatLng(mapCamera.center),
      zoom: mapCamera.zoom,
    };
    writeLastRegion(safeLocalStorage(), camera);
    updateFilters(camera);
  }

  async function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setNotice(
        "이 브라우저는 위치 확인을 지원하지 않아요. 지도를 움직여 지역을 골라 주세요.",
      );
      return;
    }
    setNotice("현재 위치를 확인하는 중이에요…");
    try {
      // Used only as the search center; never stored on the server.
      const location = roundLatLng(await currentPosition(10_000));
      setMyLocation(location);
      setNotice(null);
      writeLastRegion(safeLocalStorage(), {
        center: location,
        zoom: filters.zoom,
      });
      updateFilters({ center: location });
    } catch (error) {
      const denied =
        error instanceof GeolocationPositionError &&
        error.code === error.PERMISSION_DENIED;
      setNotice(
        denied
          ? "위치 권한이 거부되었어요. 지도를 움직여 지역을 직접 골라 주세요."
          : "현재 위치를 확인할 수 없어요. 지도를 움직여 지역을 골라 주세요.",
      );
    }
  }

  const mapMoved =
    mapCamera !== null &&
    (approxDistanceMeters(mapCamera.center, filters.center) >
      MOVED_THRESHOLD_M ||
      mapCamera.zoom !== filters.zoom);
  const activeCount = activeFilterCount(filters);
  const distanceOrigin: DistanceOrigin =
    myLocation &&
    approxDistanceMeters(myLocation, filters.center) < AT_MY_LOCATION_M
      ? "me"
      : "map";
  const summary = resultSummary(state);
  // Suggestions start from the map position the user is looking at.
  const suggestCamera = mapCamera ?? {
    center: filters.center,
    zoom: filters.zoom,
  };
  const suggestQuery = new URLSearchParams({
    lat: suggestCamera.center.lat.toFixed(5),
    lng: suggestCamera.center.lng.toFixed(5),
    z: String(suggestCamera.zoom),
  }).toString();
  const resetFilters = () => replaceFilters(clearFilters(filters));

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-zinc-200 dark:bg-zinc-900">
      {/* Map: the base layer. On mobile it ends where the collapsed sheet
          begins so the NAVER logo/scale stay visible. */}
      <div
        ref={mapAreaRef}
        className="absolute inset-x-0 top-0 bottom-[var(--sheet-collapsed)] md:bottom-0 md:left-[400px]"
      >
        <NaverMap
          keyId={mapKeyId}
          camera={{ center: filters.center, zoom: filters.zoom }}
          markers={markers}
          selectedId={selectedId}
          focus={focus}
          onSelect={selectMarker}
          onIdle={setMapCamera}
        />
      </div>

      <MapTopBar
        filters={filters}
        catalogue={catalogue}
        activeCount={activeCount}
        onChange={updateFilters}
        onOpenFilters={() => {
          setSelectedId(null);
          setMode("filters");
          setSnap("full");
        }}
        onOpenRecommend={() => {
          setSelectedId(null);
          setMode("recommend");
          setSnap("full");
        }}
        onSearchFocus={() => {
          setSelectedId(null);
          setSnap("collapsed");
        }}
        onAiSearch={runAiSearch}
        aiPending={aiPending}
      />

      {/* Map controls under the top bar. */}
      <div className="pointer-events-none absolute inset-x-0 top-[var(--overlay-top)] z-10 flex items-start justify-between gap-2 px-3 pt-1 md:left-[400px]">
        <span className="w-11" aria-hidden />
        {mapMoved ? (
          <button
            type="button"
            onClick={searchThisArea}
            className="pointer-events-auto min-h-11 rounded-full bg-white px-4 text-sm font-medium shadow-md dark:bg-zinc-800"
          >
            이 지역에서 다시 검색
          </button>
        ) : (
          <span aria-hidden />
        )}
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={useCurrentLocation}
            aria-label="현재 위치로 검색"
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg shadow-md dark:bg-zinc-800"
          >
            ◎
          </button>
          <Link
            href={`/suggest?${suggestQuery}`}
            aria-label="장소 제안"
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl leading-none shadow-md dark:bg-zinc-800"
          >
            ＋
          </Link>
        </div>
      </div>

      {/* Above the sheet like the preview card, clear of the map controls. */}
      {aiNotice && !selected && (
        <div className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--sheet-collapsed)+0.5rem)] z-30 md:bottom-6 md:left-[412px] md:right-auto md:w-[360px]">
          <AiSearchNotice
            state={aiNotice}
            catalogue={catalogue}
            loginHref={loginPath(
              `${pathname}${paramsString ? `?${paramsString}` : ""}`,
            )}
            onClose={() => setAiNotice(null)}
          />
        </div>
      )}

      {notice && !aiNotice && (
        <p
          role="status"
          className="absolute inset-x-3 top-[calc(var(--overlay-top)+3.5rem)] z-10 rounded-xl bg-white/95 p-3 text-sm shadow-md md:left-[412px] md:w-[360px] dark:bg-zinc-800/95"
        >
          {notice}
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-2 min-h-11 underline underline-offset-2"
          >
            닫기
          </button>
        </p>
      )}

      {selected && (
        <div className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--sheet-collapsed)+0.5rem)] z-30 md:bottom-6 md:left-[412px] md:right-auto md:w-[360px]">
          <RestaurantPreview
            restaurant={selected}
            distanceOrigin={distanceOrigin}
            onClose={() => setSelectedId(null)}
            evidence={
              current?.kind === "ready" && current.page.ordering === "relevance"
                ? (current.page.evidence?.[selected.id] ?? null)
                : undefined
            }
          />
        </div>
      )}

      <BottomSheet
        snap={snap}
        onSnapChange={setSnap}
        labelId="sheet-title"
        header={
          <div className="flex min-h-11 items-center justify-between gap-2">
            <h2
              id="sheet-title"
              aria-live="polite"
              className="text-base font-semibold"
            >
              {mode === "filters"
                ? "필터"
                : mode === "recommend"
                  ? "오늘 뭐 먹지?"
                  : summary}
            </h2>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-11 rounded-full px-3 text-sm text-orange-700 dark:text-orange-400"
              >
                필터 {activeCount}개 초기화
              </button>
            )}
          </div>
        }
      >
        {mode === "recommend" ? (
          <RecommendPanel
            catalogue={catalogue}
            state={recState}
            onRecommend={runRecommend}
            onMore={() =>
              hideFromRecommendation(
                recState.status === "ready"
                  ? recState.result.picks.map((p) => p.candidate.id)
                  : [],
              )
            }
            onPass={(id) => hideFromRecommendation([id])}
            onLocate={locate}
            onClose={() => {
              setMode("results");
              setSnap("half");
            }}
          />
        ) : mode === "filters" ? (
          <FilterPanel
            filters={filters}
            catalogue={catalogue}
            catalogueFailed={catalogueFailed}
            activeCount={activeCount}
            resultSummary={summary}
            onChange={updateFilters}
            onReset={resetFilters}
            onDone={() => {
              setMode("results");
              setSnap("half");
            }}
          />
        ) : (
          <ResultList
            state={state}
            selectedId={selectedId}
            hasActiveFilters={activeCount > 0}
            showTagCount={filters.tags.length > 0}
            distanceOrigin={distanceOrigin}
            onRetry={() => setRetry((n) => n + 1)}
            onLoadMore={loadMore}
            onResetFilters={resetFilters}
            onLocate={locate}
            suggestHref={`/suggest?${suggestQuery}`}
            onClearRelevance={() => updateFilters({ semantic: "" })}
          />
        )}
      </BottomSheet>
    </div>
  );
}
