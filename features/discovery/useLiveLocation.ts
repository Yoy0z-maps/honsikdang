"use client";

import { useEffect, useState } from "react";

export type LivePosition = { lat: number; lng: number; accuracy: number };

/**
 * Follows the device position while `active` (WP-08, decision C-84). The
 * watch stops while the page is hidden to save battery and resumes when it
 * is shown again. Positions stay in the browser; nothing is sent anywhere.
 */
export function useLiveLocation(active: boolean): {
  position: LivePosition | null;
  denied: boolean;
} {
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!active || !("geolocation" in navigator)) return;
    let watchId: number | null = null;

    const start = () => {
      if (watchId !== null || document.visibilityState !== "visible") return;
      watchId = navigator.geolocation.watchPosition(
        (p) =>
          setPosition({
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracy: p.coords.accuracy,
          }),
        (error) => {
          if (error.code === error.PERMISSION_DENIED) setDenied(true);
        },
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
      );
    };
    const stop = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      watchId = null;
    };
    const onVisibility = () =>
      document.visibilityState === "visible" ? start() : stop();

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [active]);

  return { position: active ? position : null, denied };
}
