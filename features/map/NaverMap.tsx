"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { Camera } from "@/lib/domain/camera";
import type { LatLng } from "@/lib/domain/geo";

export type MapMarker = { id: string; position: LatLng };

type Status = "no-key" | "loading" | "ready" | "failed";

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
};

function markerIcon(selected: boolean): naver.maps.HtmlIcon {
  // Built as an element with no user-provided text, so restaurant names can
  // never be injected into the map's HTML. The 44 px wrapper is the touch
  // target; the dot inside is the visual marker.
  const hit = document.createElement("div");
  hit.className = "flex h-11 w-11 items-center justify-center";
  const dot = document.createElement("div");
  dot.className = selected
    ? "h-6 w-6 rounded-full border-[3px] border-white bg-orange-600 shadow-lg"
    : "h-4 w-4 rounded-full border-2 border-white bg-zinc-800 shadow";
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
}: Props) {
  const [status, setStatus] = useState<Status>(keyId ? "loading" : "no-key");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef(new Map<string, naver.maps.Marker>());
  const callbacks = useRef({ onSelect, onIdle });
  const initialCamera = useRef(camera);

  useEffect(() => {
    callbacks.current = { onSelect, onIdle };
  });

  // NAVER calls this global when Open API authentication fails (documented in
  // the v3 Getting Started guide), e.g. an unregistered service URL.
  useEffect(() => {
    if (!keyId) return;
    window.navermap_authFailure = () => setStatus("failed");
    return () => {
      delete window.navermap_authFailure;
    };
  }, [keyId]);

  function init() {
    if (!containerRef.current || mapRef.current || !window.naver?.maps) return;
    const { center, zoom } = initialCamera.current;
    const map = new naver.maps.Map(containerRef.current, {
      center: new naver.maps.LatLng(center.lat, center.lng),
      zoom,
    });
    naver.maps.Event.addListener(map, "idle", () => {
      const c = map.getCenter();
      callbacks.current.onIdle({
        center: { lat: c.lat(), lng: c.lng() },
        zoom: map.getZoom(),
      });
    });
    mapRef.current = map;
    setStatus("ready");
  }

  // Follow camera changes made by the app (search area, current location).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
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
  }, [camera.center.lat, camera.center.lng, camera.zoom, status]);

  useEffect(() => {
    if (!focus || !mapRef.current) return;
    mapRef.current.panTo(
      new naver.maps.LatLng(focus.position.lat, focus.position.lng),
    );
  }, [focus, status]);

  // Sync markers with the loaded results.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const existing = markersRef.current;
    const wanted = new Set(markers.map((m) => m.id));

    for (const [id, marker] of existing) {
      if (!wanted.has(id)) {
        marker.setMap(null);
        existing.delete(id);
      }
    }
    for (const { id, position } of markers) {
      if (existing.has(id)) continue;
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(position.lat, position.lng),
        map,
        icon: markerIcon(false),
        clickable: true,
      });
      naver.maps.Event.addListener(marker, "click", () =>
        callbacks.current.onSelect(id),
      );
      existing.set(id, marker);
    }
  }, [markers, status]);

  useEffect(() => {
    if (status !== "ready") return;
    for (const [id, marker] of markersRef.current) {
      const selected = id === selectedId;
      marker.setIcon(markerIcon(selected));
      marker.setZIndex(selected ? 100 : 1);
    }
  }, [selectedId, markers, status]);

  useEffect(() => {
    const existing = markersRef.current;
    return () => {
      for (const marker of existing.values()) marker.setMap(null);
      existing.clear();
      mapRef.current?.destroy();
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
        aria-label="식당 지도. 같은 결과를 결과 목록에서도 볼 수 있습니다."
        data-testid="map"
        className="h-full w-full"
      />
      {status !== "ready" && (
        <div
          className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-zinc-600 dark:text-zinc-300"
          role="status"
        >
          {status === "loading" && "지도를 불러오는 중이에요…"}
          {status === "no-key" &&
            "지도를 불러올 수 없어요. 아래 결과 목록에서 식당을 확인해 주세요."}
          {status === "failed" &&
            "지도 인증에 실패했어요. 아래 결과 목록에서 식당을 확인해 주세요."}
        </div>
      )}
    </div>
  );
}
