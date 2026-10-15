"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/domain/geo";

export type MapMarker = { id: string; position: LatLng };

type Status = "no-key" | "loading" | "ready" | "failed";

type Props = {
  keyId: string | null;
  center: LatLng;
  markers: MapMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Called when the user stops moving the map. */
  onCenterIdle: (center: LatLng) => void;
};

function markerIcon(selected: boolean): naver.maps.HtmlIcon {
  // Built as an element with no user-provided text, so restaurant names can
  // never be injected into the map's HTML.
  const dot = document.createElement("div");
  dot.className = selected
    ? "h-5 w-5 rounded-full border-2 border-white bg-orange-600 shadow-md"
    : "h-4 w-4 rounded-full border-2 border-white bg-zinc-800 shadow";
  return { content: dot, anchor: new naver.maps.Point(10, 10) };
}

export function NaverMap({
  keyId,
  center,
  markers,
  selectedId,
  onSelect,
  onCenterIdle,
}: Props) {
  const [status, setStatus] = useState<Status>(keyId ? "loading" : "no-key");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef(new Map<string, naver.maps.Marker>());
  const callbacks = useRef({ onSelect, onCenterIdle });
  const initialCenter = useRef(center);

  useEffect(() => {
    callbacks.current = { onSelect, onCenterIdle };
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
    const map = new naver.maps.Map(containerRef.current, {
      center: new naver.maps.LatLng(
        initialCenter.current.lat,
        initialCenter.current.lng,
      ),
      zoom: 15,
    });
    naver.maps.Event.addListener(map, "idle", () => {
      const c = map.getCenter();
      callbacks.current.onCenterIdle({ lat: c.lat(), lng: c.lng() });
    });
    mapRef.current = map;
    setStatus("ready");
  }

  // Follow external center changes (search area, current location).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const current = map.getCenter();
    if (
      Math.abs(current.lat() - center.lat) > 1e-5 ||
      Math.abs(current.lng() - center.lng) > 1e-5
    ) {
      map.setCenter(new naver.maps.LatLng(center.lat, center.lng));
    }
  }, [center.lat, center.lng, status]);

  // Sync markers with the current result page.
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
    <div className="relative h-full w-full bg-zinc-100 dark:bg-zinc-900">
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
        aria-label="식당 지도. 같은 결과를 목록에서도 볼 수 있습니다."
        className="h-full w-full"
      />
      {status !== "ready" && (
        <div
          className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-zinc-600 dark:text-zinc-300"
          role="status"
        >
          {status === "loading" && "지도를 불러오는 중이에요…"}
          {status === "no-key" &&
            "지도를 불러올 수 없어요. 목록에서 식당을 확인해 주세요."}
          {status === "failed" &&
            "지도 인증에 실패했어요. 목록에서 식당을 확인해 주세요."}
        </div>
      )}
    </div>
  );
}
