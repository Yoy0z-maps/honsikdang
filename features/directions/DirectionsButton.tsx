"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  detectPlatform,
  directionsLink,
  type Destination,
  type DirectionsLink,
} from "@/lib/domain/directions";

const IOS_FALLBACK_MS = 1500;

const noSubscribe = () => () => {};

/**
 * Opens walking directions in the NAVER Map app (Q33). The app starts from
 * the user's current location; we never send it. Desktop and places the
 * app cannot route to get guidance and an address copy button (Q34).
 */
export function DirectionsButton({
  destination,
  address,
  className,
}: {
  destination: Destination;
  address: string;
  className: string;
}) {
  // Platform is only known in the browser; the server renders the neutral
  // variant ("" user agent) and the client swaps in the app link.
  const userAgent = useSyncExternalStore(
    noSubscribe,
    () => navigator.userAgent,
    () => "",
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const fallbackTimer = useRef<number | undefined>(undefined);

  const link: DirectionsLink | null = userAgent
    ? directionsLink(
        destination,
        detectPlatform(userAgent),
        window.location.origin,
      )
    : null;

  useEffect(() => {
    // Leaving for the app hides the page; cancel the App Store fallback.
    const cancel = () => {
      if (document.visibilityState === "hidden") {
        window.clearTimeout(fallbackTimer.current);
      }
    };
    document.addEventListener("visibilitychange", cancel);
    return () => {
      document.removeEventListener("visibilitychange", cancel);
      window.clearTimeout(fallbackTimer.current);
    };
  }, []);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  }

  if (link?.kind === "android") {
    return (
      <a href={link.href} className={className} data-testid="directions">
        길찾기
      </a>
    );
  }

  if (link?.kind === "ios") {
    const { href, fallbackHref } = link;
    return (
      <a
        href={href}
        className={className}
        data-testid="directions"
        onClick={() => {
          window.clearTimeout(fallbackTimer.current);
          fallbackTimer.current = window.setTimeout(() => {
            if (document.visibilityState === "visible") {
              window.location.href = fallbackHref;
            }
          }, IOS_FALLBACK_MS);
        }}
      >
        길찾기
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        className={className}
        aria-expanded={helpOpen}
        data-testid="directions"
        onClick={() => setHelpOpen((open) => !open)}
      >
        길찾기
      </button>
      {helpOpen && (
        <div
          role="region"
          aria-label="길찾기 안내"
          className="order-last col-span-2 basis-full rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-800"
        >
          <p>
            길찾기는 네이버 지도 앱이 설치된 휴대폰에서 열 수 있어요. 주소를
            복사해 지도 앱에서 검색해도 돼요.
          </p>
          <p className="mt-1 font-medium">{address}</p>
          <button
            type="button"
            onClick={copyAddress}
            className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-zinc-300 px-3 dark:border-zinc-600"
          >
            주소 복사
          </button>
          <p
            role="status"
            className="mt-1 text-xs text-zinc-600 dark:text-zinc-400"
          >
            {copied === "done"
              ? "주소를 복사했어요."
              : copied === "failed"
                ? "복사하지 못했어요. 주소를 길게 눌러 복사해 주세요."
                : ""}
          </p>
        </div>
      )}
    </>
  );
}
