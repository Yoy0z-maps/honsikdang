import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RestaurantSummary } from "@/lib/restaurants/search";
import { ResultList, resultSummary, type ResultState } from "./ResultList";

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
  avgRating: 4,
  ratingCount: 2,
};

const handlers = {
  onRetry: vi.fn(),
  onLoadMore: vi.fn(),
  onResetFilters: vi.fn(),
  onLocate: vi.fn(),
};

function renderList(
  state: ResultState,
  hasActiveFilters = false,
  distanceOrigin: "me" | "map" = "map",
) {
  return render(
    <ResultList
      state={state}
      selectedId={null}
      hasActiveFilters={hasActiveFilters}
      showTagCount={false}
      distanceOrigin={distanceOrigin}
      {...handlers}
    />,
  );
}

type Ready = Extract<ResultState, { status: "ready" }>;
const ready = (overrides: Partial<Ready> = {}): ResultState => ({
  status: "ready",
  items: [sample],
  total: 1,
  excludedNoPrice: 0,
  areaClamped: false,
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

  it("renders results with sample size, date and distance origin", () => {
    renderList(ready());
    expect(
      screen.getByRole("link", { name: "테스트 식당" }).getAttribute("href"),
    ).toBe(`/restaurants/${sample.id}`);
    expect(screen.getByText(/4\.5\/5/).textContent).toContain("리뷰 2개");
    expect(screen.getByText("2026.10.01")).toBeDefined();
    expect(screen.getByText(/지도 중심에서 320m/)).toBeDefined();
  });

  it("labels distance from the user only when their location is used", () => {
    renderList(ready(), false, "me");
    expect(screen.getByText(/내 위치에서 320m/)).toBeDefined();
  });

  it("locates a restaurant on the map", () => {
    renderList(ready());
    fireEvent.click(
      screen.getByRole("button", { name: "테스트 식당 지도에서 보기" }),
    );
    expect(handlers.onLocate).toHaveBeenCalledWith(sample.id);
  });

  it("says when there is no approved review instead of showing a score", () => {
    renderList(
      ready({ items: [{ ...sample, reviewCount: 0, avgSoloComfort: null }] }),
    );
    expect(screen.getByText("아직 승인된 혼밥 리뷰가 없어요.")).toBeDefined();
    expect(screen.queryByText(/\/5/)).toBeNull();
  });

  it("explains budget exclusions and a clamped map area", () => {
    renderList(ready({ excludedNoPrice: 2, areaClamped: true }));
    expect(
      screen.getByText("가격 정보가 없는 2곳은 예산 필터에서 제외했어요."),
    ).toBeDefined();
    expect(screen.getByText(/화면 중앙 주변만 검색했어요/)).toBeDefined();
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

describe("resultSummary", () => {
  it("describes each state for the sheet header", () => {
    expect(resultSummary({ status: "loading" })).toBe("식당을 찾는 중…");
    expect(resultSummary({ status: "error" })).toBe("목록을 불러오지 못했어요");
    expect(resultSummary(ready({ total: 7 }))).toBe("식당 7곳");
  });
});
