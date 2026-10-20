"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Camera } from "@/lib/domain/camera";
import type { LatLng } from "@/lib/domain/geo";
import type { LivePosition } from "@/features/discovery/useLiveLocation";

export type MapMarker = {
  id: string;
  position: LatLng;
  /** Short visible label, e.g. a recommendation number (text only). */
  label?: string;
};

export type MapStatus = "no-key" | "loading" | "ready" | "failed";
type Status = MapStatus;

type Props = {
  keyId: string | null;
  /** Camera chosen by the app (URL / location); the map follows it. */
  camera: Camera;
  markers: MapMarker[];
  selectedId: string | null;
  /** Pan to this point without changing the search (e.g. "지도에서 보기"). */
  focus: { position: LatLng; nonce: number } | null;
  onSelect: (id: string) => void;
  /** Called when the user stops moving the map. */
  onIdle: (camera: Camera) => void;
  /** Reports SDK state, e.g. to explain a fallback position. */
  onStatusChange?: (status: MapStatus) => void;
  /** The user's live position: a blue dot with an accuracy ring (WP-08). */
  myPosition?: LivePosition | null;
  /** Keep the map centered on myPosition as it moves. */
  follow?: boolean;
  /** The user started dragging the map (turns off "follow me"). */
  onUserDrag?: () => void;
  /** Accessible name of the map region (context-specific). */
  label?: string;
  /** What to do instead when the map cannot load (context-specific). */
  fallbackHint?: string;
};

function myLocationIcon(): naver.maps.HtmlIcon {
  const dot = document.createElement("div");
  dot.className =
    "h-4 w-4 rounded-full border-[3px] border-white bg-blue-600 shadow-[0_0_0_2px_rgba(37,99,235,0.35)]";
  dot.setAttribute("aria-hidden", "true");
  return { content: dot, anchor: new naver.maps.Point(8, 8) };
}

function markerIcon(selected: boolean, label?: string): naver.maps.HtmlIcon {
  // Built as an element with no user-provided text, so restaurant names can
  // never be injected into the map's HTML. The 44 px wrapper is the touch
  // target; the dot inside is the visual marker.
  const hit = document.createElement("div");
  hit.className = "flex h-11 w-11 items-center justify-center";
  const dot = document.createElement("div");
  if (label) {
    // textContent, never innerHTML.
    dot.textContent = label;
    dot.className =
      "flex items-center justify-center rounded-full border-2 border-white bg-orange-600 font-bold text-white shadow-lg " +
      (selected ? "h-9 w-9 text-base" : "h-7 w-7 text-sm");
  } else {
    dot.className = selected
      ? "h-6 w-6 rounded-full border-[3px] border-white bg-orange-600 shadow-lg"
      : "h-4 w-4 rounded-full border-2 border-white bg-zinc-800 shadow";
  }
  hit.appendChild(dot);
  return { content: hit, anchor: new naver.maps.Point(22, 22) };
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-5;

export function NaverMap({
  keyId,
  camera,
  markers,
  selectedId,
  focus,
  onSelect,
  onIdle,
  onStatusChange,
  myPosition = null,
  follow = false,
  onUserDrag,
  label = "식당 지도. 같은 결과를 결과 목록에서도 볼 수 있습니다.",
  fallbackHint = "아래 결과 목록에서 식당을 확인해 주세요.",
}: Props) {
  const [status, setStatus] = useState<Status>(keyId ? "loading" : "no-key");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef(new Map<string, naver.maps.Marker>());
  const labelsRef = useRef(new Map<string, string>());
  const callbacks = useRef({ onSelect, onIdle, onUserDrag });
  const myMarkerRef = useRef<naver.maps.Marker | null>(null);
  const myCircleRef = useRef<naver.maps.Circle | null>(null);
  const initialCamera = useRef(camera);

  useEffect(() => {
    callbacks.current = { onSelect, onIdle, onUserDrag };
  });

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // Production incident 2026-10-20: with an unregistered service URL the SDK
  // loads, then fails authentication and clears naver.maps; map effects
  // calling naver.maps.LatLng then crashed the whole page. Any map failure
  // now drops the map and shows the list fallback instead.
  const failMap = useCallback((error?: unknown) => {
    if (error) console.error("naver map failed", error);
    const existing = markersRef.current;
    try {
      for (const marker of existing.values()) marker.setMap(null);
      mapRef.current?.destroy();
    } catch {
      // The SDK may already be gone; nothing left to clean up.
    }
    existing.clear();
    mapRef.current = null;
    myMarkerRef.current = null;
    myCircleRef.current = null;
    setStatus("failed");
  }, []);

  /** Runs `fn` only while the map and SDK are usable; errors fall back. */
  const withMap = useCallback(
    (fn: (map: naver.maps.Map) => void) => {
      const map = mapRef.current;
      if (!map || !window.naver?.maps) return;
      try {
        fn(map);
      } catch (error) {
        // Deferred: this runs inside effects, which must not set state
        // synchronously.
        window.setTimeout(() => failMap(error), 0);
      }
    },
    [failMap],
  );

  // NAVER calls this global when Open API authentication fails (documented in
  // the v3 Getting Started guide), e.g. an unregistered service URL.
  useEffect(() => {
    if (!keyId) return;
    window.navermap_authFailure = () => failMap();
    return () => {
      delete window.navermap_authFailure;
    };
  }, [keyId, failMap]);

  function init() {
    if (!containerRef.current || mapRef.current || !window.naver?.maps) return;
    try {
      const { center, zoom } = initialCamera.current;
      const map = new naver.maps.Map(containerRef.current, {
        center: new naver.maps.LatLng(center.lat, center.lng),
        zoom,
      });
      naver.maps.Event.addListener(map, "dragstart", () =>
        callbacks.current.onUserDrag?.(),
      );
      naver.maps.Event.addListener(map, "idle", () => {
        const c = map.getCenter();
        callbacks.current.onIdle({
          center: { lat: c.lat(), lng: c.lng() },
          zoom: map.getZoom(),
        });
      });
      mapRef.current = map;
      setStatus("ready");
    } catch (error) {
      failMap(error);
    }
  }

  // Follow camera changes made by the app (search area, current location).
  useEffect(() => {
    if (status !== "ready") return;
    withMap((map) => {
      const current = map.getCenter();
      if (
        !near(current.lat(), camera.center.lat) ||
        !near(current.lng(), camera.center.lng)
      ) {
        map.setCenter(
          new naver.maps.LatLng(camera.center.lat, camera.center.lng),
        );
      }
      if (map.getZoom() !== camera.zoom) map.setZoom(camera.zoom, false);
    });
  }, [camera.center.lat, camera.center.lng, camera.zoom, status, withMap]);

  useEffect(() => {
    if (!focus || status !== "ready") return;
    withMap((map) =>
      map.panTo(new naver.maps.LatLng(focus.position.lat, focus.position.lng)),
    );
  }, [focus, status, withMap]);

  // My location: created once, then moved as the position updates.
  useEffect(() => {
    if (status !== "ready") return;
    withMap((map) => {
      if (!myPosition) {
        myMarkerRef.current?.setMap(null);
        myCircleRef.current?.setMap(null);
        myMarkerRef.current = null;
        myCircleRef.current = null;
        return;
      }
      const at = new naver.maps.LatLng(myPosition.lat, myPosition.lng);
      // Cap the ring so a coarse fix does not cover the whole map.
      const radius = Math.min(Math.max(myPosition.accuracy, 5), 500);
      if (!myMarkerRef.current) {
        myCircleRef.current = new naver.maps.Circle({
          map,
          center: at,
          radius,
          fillColor: "#2563eb",
          fillOpacity: 0.12,
          strokeColor: "#2563eb",
          strokeOpacity: 0.35,
          strokeWeight: 1,
          clickable: false,
        });
        myMarkerRef.current = new naver.maps.Marker({
          position: at,
          map,
          icon: myLocationIcon(),
          clickable: false,
          zIndex: 200,
        });
      } else {
        myMarkerRef.current.setPosition(at);
        myCircleRef.current?.setCenter(at);
        myCircleRef.current?.setRadius(radius);
      }
      if (follow) map.panTo(at);
    });
  }, [myPosition, follow, status, withMap]);

  // Sync markers with the loaded results.
  useEffect(() => {
    if (status !== "ready") return;
    withMap((map) => {
      const existing = markersRef.current;
      const wanted = new Set(markers.map((m) => m.id));

      // A marker whose label changed is recreated.
      const labels = new Map(markers.map((m) => [m.id, m.label ?? ""]));
      for (const [id, marker] of existing) {
        if (!wanted.has(id) || labelsRef.current.get(id) !== labels.get(id)) {
          marker.setMap(null);
          existing.delete(id);
        }
      }
      labelsRef.current = labels;
      for (const { id, position, label } of markers) {
        if (existing.has(id)) continue;
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(position.lat, position.lng),
          map,
          icon: markerIcon(false, label),
          clickable: true,
        });
        naver.maps.Event.addListener(marker, "click", () =>
          callbacks.current.onSelect(id),
        );
        existing.set(id, marker);
      }
    });
  }, [markers, status, withMap]);

  useEffect(() => {
    if (status !== "ready") return;
    withMap(() => {
      for (const [id, marker] of markersRef.current) {
        const selected = id === selectedId;
        marker.setIcon(
          markerIcon(selected, labelsRef.current.get(id) || undefined),
        );
        marker.setZIndex(selected ? 100 : 1);
      }
    });
  }, [selectedId, markers, status, withMap]);

  useEffect(() => {
    const existing = markersRef.current;
    return () => {
      try {
        for (const marker of existing.values()) marker.setMap(null);
        mapRef.current?.destroy();
      } catch {
        // SDK already gone (auth failure); nothing to clean up.
      }
      existing.clear();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-full w-full bg-zinc-200 dark:bg-zinc-900">
      {keyId && (
        <Script
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(keyId)}`}
          strategy="afterInteractive"
          onReady={init}
          onError={() => setStatus("failed")}
        />
      )}
      <div
        ref={containerRef}
        role="region"
        aria-label={label}
        data-testid="map"
        className="h-full w-full"
      />
      {status !== "ready" && (
        <div
          className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-zinc-600 dark:text-zinc-300"
          role="status"
        >
          {status === "loading" && "지도를 불러오는 중이에요…"}
          {status === "no-key" && `지도를 불러올 수 없어요. ${fallbackHint}`}
          {status === "failed" && `지도 인증에 실패했어요. ${fallbackHint}`}
        </div>
      )}
    </div>
  );
}
