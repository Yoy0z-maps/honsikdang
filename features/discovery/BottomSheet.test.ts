import { describe, expect, it } from "vitest";
import { nearestSnap, stepSnap } from "./BottomSheet";

const heights = { collapsed: 88, half: 400, full: 700 };

describe("nearestSnap", () => {
  it("snaps to the closest height when released slowly", () => {
    expect(nearestSnap(100, heights, 0)).toBe("collapsed");
    expect(nearestSnap(380, heights, 0)).toBe("half");
    expect(nearestSnap(650, heights, 0)).toBe("full");
  });

  it("follows a fling direction", () => {
    // Released near half but flung upward (negative px/ms) → full.
    expect(nearestSnap(420, heights, -2)).toBe("full");
    // Released near half but flung downward → collapsed.
    expect(nearestSnap(380, heights, 2)).toBe("collapsed");
  });
});

describe("stepSnap", () => {
  it("moves one step and stops at the ends", () => {
    expect(stepSnap("collapsed", 1)).toBe("half");
    expect(stepSnap("half", 1)).toBe("full");
    expect(stepSnap("full", 1)).toBe("full");
    expect(stepSnap("collapsed", -1)).toBe("collapsed");
  });
});
