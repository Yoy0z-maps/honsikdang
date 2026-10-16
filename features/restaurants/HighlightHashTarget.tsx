"use client";

import { useEffect } from "react";

/**
 * Brings the review named in the URL hash (#review-…) into view and marks it
 * (WP-05c evidence links). CSS :target does not apply after client-side
 * navigation, so this sets data-highlighted instead.
 */
export function HighlightHashTarget() {
  useEffect(() => {
    let current: HTMLElement | null = null;
    function apply() {
      current?.removeAttribute("data-highlighted");
      const id = decodeURIComponent(window.location.hash.slice(1));
      current = /^review-[0-9a-f-]{36}$/.test(id)
        ? document.getElementById(id)
        : null;
      if (!current) return;
      current.setAttribute("data-highlighted", "true");
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      current.scrollIntoView({
        block: "center",
        behavior: reduce ? "auto" : "smooth",
      });
    }
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);
  return null;
}
