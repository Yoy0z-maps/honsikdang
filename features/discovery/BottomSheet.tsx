"use client";

import { useRef, type ReactNode, type PointerEvent } from "react";
import { useMediaQuery } from "./useMediaQuery";

export type SheetSnap = "collapsed" | "half" | "full";
const ORDER: SheetSnap[] = ["collapsed", "half", "full"];

const SNAP_LABELS: Record<SheetSnap, string> = {
  collapsed: "결과 목록 펼치기",
  half: "결과 목록 더 펼치기",
  full: "결과 목록 접기",
};

type Props = {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  header: ReactNode;
  children: ReactNode;
  labelId: string;
};

/** Picks the snap whose visible height is closest, biased by fling velocity. */
export function nearestSnap(
  visiblePx: number,
  heights: Record<SheetSnap, number>,
  velocityPxPerMs: number,
): SheetSnap {
  // Upward fling (negative velocity) projects the sheet further open.
  const projected = visiblePx - velocityPxPerMs * 150;
  let best: SheetSnap = "collapsed";
  for (const snap of ORDER) {
    if (
      Math.abs(heights[snap] - projected) < Math.abs(heights[best] - projected)
    ) {
      best = snap;
    }
  }
  return best;
}

export function stepSnap(snap: SheetSnap, direction: 1 | -1): SheetSnap {
  const index = ORDER.indexOf(snap) + direction;
  return ORDER[Math.max(0, Math.min(ORDER.length - 1, index))];
}

/**
 * Non-modal bottom sheet over the map (master plan §5A). Mobile: three snap
 * heights, dragged from the header; the map behind stays interactive.
 * ≥768 px: a fixed left panel. Snap position is CSS-driven; during a drag the
 * transform is set directly on the element so React (and the map) do not
 * re-render per frame.
 */
export function BottomSheet({
  snap,
  onSnapChange,
  header,
  children,
  labelId,
}: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const sheetRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    pointerId: number;
    startY: number;
    startTop: number;
    lastY: number;
    lastT: number;
    velocity: number;
    moved: boolean;
  } | null>(null);

  function heights(): Record<SheetSnap, number> {
    const sheet = sheetRef.current!;
    return {
      collapsed: headerRef.current!.offsetHeight,
      half: window.innerHeight * 0.5,
      full: sheet.offsetHeight,
    };
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (isDesktop) return;
    if ((event.target as HTMLElement).closest("button:not([data-grabber]), a"))
      return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    // Pointer capture starts only once the pointer actually drags (see
    // onPointerMove); capturing here would retarget the click and the
    // grabber button would never toggle on tap.
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startTop: sheet.getBoundingClientRect().top,
      lastY: event.clientY,
      lastT: event.timeStamp,
      velocity: 0,
      moved: false,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const sheet = sheetRef.current;
    if (!d || !sheet || d.pointerId !== event.pointerId) return;
    const dy = event.clientY - d.startY;
    if (!d.moved && Math.abs(dy) < 6) return;
    if (!d.moved) event.currentTarget.setPointerCapture(event.pointerId);
    d.moved = true;
    const h = heights();
    const fullTop = window.innerHeight - h.full;
    const collapsedTop = window.innerHeight - h.collapsed;
    const top = Math.min(collapsedTop, Math.max(fullTop, d.startTop + dy));
    sheet.style.transition = "none";
    sheet.style.transform = `translateY(${top - fullTop}px)`;
    const dt = Math.max(1, event.timeStamp - d.lastT);
    d.velocity = (event.clientY - d.lastY) / dt;
    d.lastY = event.clientY;
    d.lastT = event.timeStamp;
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const sheet = sheetRef.current;
    drag.current = null;
    if (!d || !sheet || d.pointerId !== event.pointerId || !d.moved) return;
    const visible = window.innerHeight - sheet.getBoundingClientRect().top;
    sheet.style.transition = "";
    sheet.style.transform = "";
    onSnapChange(nearestSnap(visible, heights(), d.velocity));
  }

  return (
    <section
      ref={sheetRef}
      aria-labelledby={labelId}
      data-testid="bottom-sheet"
      data-snap={snap}
      className={[
        "fixed inset-x-0 bottom-0 z-20 flex h-[calc(100dvh-var(--overlay-top))] flex-col rounded-t-2xl bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.15)] dark:bg-zinc-900",
        "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
        snap === "collapsed" &&
          "translate-y-[calc(100%-var(--sheet-collapsed))]",
        snap === "half" && "translate-y-[calc(100%-50dvh)]",
        snap === "full" && "translate-y-0",
        // Desktop: fixed left panel, no dragging.
        "md:inset-y-0 md:right-auto md:h-dvh md:w-[400px] md:translate-y-0 md:rounded-none md:shadow-lg",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        ref={headerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="h-[var(--sheet-collapsed)] shrink-0 touch-none px-4 pb-[env(safe-area-inset-bottom)] select-none md:h-auto md:touch-auto md:pt-[calc(var(--overlay-top)-1rem)] md:pb-2"
      >
        <button
          type="button"
          data-grabber
          aria-expanded={snap !== "collapsed"}
          aria-controls={`${labelId}-content`}
          aria-label={SNAP_LABELS[snap]}
          onClick={() =>
            onSnapChange(snap === "full" ? "collapsed" : stepSnap(snap, 1))
          }
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault();
              onSnapChange(stepSnap(snap, 1));
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              onSnapChange(stepSnap(snap, -1));
            }
          }}
          className="mx-auto flex h-11 w-full items-center justify-center md:hidden"
        >
          <span className="h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        </button>
        {header}
      </div>
      <div
        id={`${labelId}-content`}
        // Collapsed on mobile the list is off-screen: keep it out of the tab
        // order and the accessibility tree. Desktop always shows it.
        inert={!isDesktop && snap === "collapsed"}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        {children}
      </div>
    </section>
  );
}
