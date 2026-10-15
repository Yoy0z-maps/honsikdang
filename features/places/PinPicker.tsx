"use client";

import { useState } from "react";
import { NaverMap, type MapStatus } from "@/features/map/NaverMap";
import type { Camera } from "@/lib/domain/camera";
import type { LatLng } from "@/lib/domain/geo";
import { getNaverMapKeyId } from "@/lib/env";

/**
 * Center-pin location picker (decision Q24): the pin stays in the middle and
 * the user moves the map under it, so a finger never covers the pin.
 */
export function PinPicker({
  initial,
  onChange,
}: {
  initial: Camera;
  onChange: (position: LatLng) => void;
}) {
  const keyId = getNaverMapKeyId();
  const [status, setStatus] = useState<MapStatus>(keyId ? "loading" : "no-key");
  const noMap = status === "no-key" || status === "failed";

  return (
    <div className="space-y-2">
      <div className="relative h-[38dvh] min-h-56 overflow-hidden rounded-2xl">
        <NaverMap
          keyId={keyId}
          camera={initial}
          markers={[]}
          selectedId={null}
          focus={null}
          onSelect={() => {}}
          onIdle={(camera) => onChange(camera.center)}
          onStatusChange={setStatus}
          label="식당 위치 선택 지도. 지도를 움직여 가운데 핀을 식당 위치에 맞춥니다."
          fallbackHint="아래 안내를 확인해 주세요."
        />
        {!noMap && (
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-4xl leading-none drop-shadow"
          >
            📍
          </div>
        )}
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
        {noMap
          ? "지도를 불러올 수 없어 지금 보던 지도 중심 위치로 제안돼요. 주소를 정확히 적어 주세요."
          : "지도를 움직여 핀을 식당 입구에 맞춰 주세요."}
      </p>
    </div>
  );
}
