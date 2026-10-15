import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RestaurantSummary } from "@/lib/restaurants/search";
import { ResultList, type ResultState } from "./ResultList";

// Test fixture, not real data.
const sample: RestaurantSummary = {
  id: "00000000-0000-4000-8000-0000000000aa",
  name: "테스트 식당",
  address: "테스트로 1",
  position: { lat: 37.5, lng: 127 },
  category: { slug: "korean", label: "한식" },
  distanceM: 320,
  reviewCount: 2,
  avgSoloComfort: 4.5,
  medianPrice: 9500,
  lastVisitedAt: "2026-10-01",
  tagReviewCount: 1,
};

const handlers = {
  onRetry: vi.fn(),
  onLoadMore: vi.fn(),
  onResetFilters: vi.fn(),
  onFocusItem: vi.fn(),
};

function renderList(state: ResultState, hasActiveFilters = false) {
  return render(
    <ResultList
      state={state}
      selectedId={null}
      hasActiveFilters={hasActiveFilters}
      showTagCount={false}
      {...handlers}
    />,
  );
}

const ready = (
  overrides: Partial<Extract<ResultState, { status: "ready" }>> = {},
): ResultState => ({
  status: "ready",
  items: [sample],
  total: 1,
  excludedNoPrice: 0,
  loadingMore: false,
  loadMoreFailed: false,
  ...overrides,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ResultList", () => {
  it("shows a busy placeholder while loading", () => {
    renderList({ status: "loading" });
    expect(screen.getByLabelText("식당 목록을 불러오는 중")).toBeDefined();
  });

  it("shows an error with a retry action", () => {
    renderList({ status: "error" });
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(handlers.onRetry).toHaveBeenCalledOnce();
  });

  it("renders results with sample size and date", () => {
    renderList(ready());
    expect(screen.getByRole("heading", { name: "식당 1곳" })).toBeDefined();
    expect(
      screen.getByRole("link", { name: "테스트 식당" }).getAttribute("href"),
    ).toBe(`/restaurants/${sample.id}`);
    expect(screen.getByText(/4\.5\/5/).textContent).toContain("리뷰 2개");
    expect(screen.getByText("2026.10.01")).toBeDefined();
  });

  it("says when there is no approved review instead of showing a score", () => {
    renderList(
      ready({ items: [{ ...sample, reviewCount: 0, avgSoloComfort: null }] }),
    );
    expect(screen.getByText("아직 승인된 혼밥 리뷰가 없어요.")).toBeDefined();
    expect(screen.queryByText(/\/5/)).toBeNull();
  });

  it("explains restaurants excluded by the budget filter", () => {
    renderList(ready({ excludedNoPrice: 2 }));
    expect(
      screen.getByText("가격 정보가 없는 2곳은 예산 필터에서 제외했어요."),
    ).toBeDefined();
  });

  it("offers a filter reset on empty results only when filters are active", () => {
    renderList(ready({ items: [], total: 0 }), true);
    expect(screen.getByText("조건에 맞는 식당이 없어요.")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "필터 초기화" }));
    expect(handlers.onResetFilters).toHaveBeenCalledOnce();

    cleanup();
    renderList(ready({ items: [], total: 0 }), false);
    expect(screen.queryByRole("button", { name: "필터 초기화" })).toBeNull();
  });

  it("shows load more while results remain", () => {
    renderList(ready({ total: 5 }));
    fireEvent.click(screen.getByRole("button", { name: "더 보기 (1/5)" }));
    expect(handlers.onLoadMore).toHaveBeenCalledOnce();
  });
});
