import { expect, test, type Page } from "@playwright/test";

// Depends on supabase/seed.sql (synthetic, local-only data around 서울시청).
// At zoom 14 all 8 approved seed restaurants near 서울시청 are inside both
// test viewports; the far-away one (강남) and the pending one are not.
const Z14 = "/?z=14";
const sheet = (page: Page) => page.getByTestId("bottom-sheet");
const sheetTitle = (page: Page) => page.locator("#sheet-title");

async function expectMinTouchTarget(
  page: Page,
  name: string,
  locator = page.getByRole("button", { name }),
) {
  const box = await locator.first().boundingBox();
  expect(box, name).not.toBeNull();
  expect(box!.width, `${name} width`).toBeGreaterThanOrEqual(44);
  expect(box!.height, `${name} height`).toBeGreaterThanOrEqual(44);
}

test.describe("map-first home (§5A)", () => {
  test("opens on the map with overlays, not a list", async ({ page }) => {
    await page.goto("/");
    const viewport = page.viewportSize()!;
    const map = await page.getByTestId("map").boundingBox();
    expect(map).not.toBeNull();
    // The map is the dominant surface (only the collapsed sheet is outside).
    expect(
      (map!.width * map!.height) / (viewport.width * viewport.height),
    ).toBeGreaterThan(0.8);
    await expect(sheet(page)).toHaveAttribute("data-snap", "collapsed");
    const search = await page
      .getByLabel("식당 이름 또는 주소 검색")
      .boundingBox();
    expect(search!.y).toBeLessThan(viewport.height * 0.15);
    // Without a NAVER key the map shows a fallback; browsing still works.
    await expect(page.getByText(/지도를 불러올 수 없어요/)).toBeVisible();
    await expect(sheetTitle(page)).toHaveText(/식당 \d+곳/);
    await expect(page.getByText("[예시] 종로 김밥")).toHaveCount(0);
  });

  test("has no horizontal overflow and 44 px touch targets", async ({
    page,
  }) => {
    await page.goto(Z14);
    await expect(sheetTitle(page)).toHaveText("식당 8곳");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expectMinTouchTarget(page, "검색");
    await expectMinTouchTarget(page, "필터 열기");
    await expectMinTouchTarget(page, "한식");
    await expectMinTouchTarget(page, "현재 위치로 검색");
    await expectMinTouchTarget(page, "결과 목록 펼치기");
    await expectMinTouchTarget(
      page,
      "로그인",
      page.getByRole("link", { name: "로그인" }),
    );
  });

  test("bottom sheet snaps by tap and keyboard", async ({ page }) => {
    await page.goto(Z14);
    const grabber = page.getByRole("button", { name: "결과 목록 펼치기" });
    await grabber.click();
    await expect(sheet(page)).toHaveAttribute("data-snap", "half");
    await expect(
      page.getByRole("link", { name: "[예시] 시청 국밥" }),
    ).toBeVisible();

    const more = page.getByRole("button", { name: "결과 목록 더 펼치기" });
    await more.focus();
    await page.keyboard.press("ArrowUp");
    await expect(sheet(page)).toHaveAttribute("data-snap", "full");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(sheet(page)).toHaveAttribute("data-snap", "collapsed");
    // Collapsed: the list is out of the tab order.
    await expect(page.locator("#sheet-title-content")).toHaveAttribute(
      "inert",
      "",
    );
  });

  test("category chip filters results, updates the URL and survives reload", async ({
    page,
  }) => {
    await page.goto(Z14);
    await page.getByRole("button", { name: "일식" }).click();
    await expect(page).toHaveURL(/cat=japanese/);
    await expect(sheetTitle(page)).toHaveText("식당 2곳");
    await expect(page.getByRole("button", { name: "일식" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.reload();
    await expect(sheetTitle(page)).toHaveText("식당 2곳");
  });

  test("filter sheet: budget with exclusion note, then one-tap reset", async ({
    page,
  }) => {
    await page.goto(Z14);
    await page.getByRole("button", { name: "필터 열기" }).click();
    await expect(sheet(page)).toHaveAttribute("data-snap", "full");
    await expect(sheetTitle(page)).toHaveText("필터");
    await page.getByLabel("1인 예산").selectOption("10000");
    await page.getByRole("button", { name: /결과 보기 · 식당 4곳/ }).click();
    await expect(sheet(page)).toHaveAttribute("data-snap", "half");
    await expect(
      page.getByText("가격 정보가 없는 2곳은 예산 필터에서 제외했어요."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "필터, 1개 적용 중" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "필터 1개 초기화" }).click();
    await expect(page).toHaveURL(/\?z=14$/);
    await expect(sheetTitle(page)).toHaveText("식당 8곳");
  });

  test("locating a result opens a compact preview that leads to details", async ({
    page,
  }) => {
    await page.goto(Z14);
    await page.getByRole("button", { name: "결과 목록 펼치기" }).click();
    await page
      .getByRole("button", { name: "[예시] 시청 국밥 지도에서 보기" })
      .click();
    const preview = page.getByTestId("restaurant-preview");
    await expect(preview).toBeVisible();
    await expect(sheet(page)).toHaveAttribute("data-snap", "collapsed");
    await expect(
      preview.getByRole("heading", { name: "[예시] 시청 국밥" }),
    ).toBeVisible();
    await expect(preview).toContainText(/(지도 중심|내 위치)에서/);
    await preview.getByRole("button", { name: "미리보기 닫기" }).click();
    await expect(preview).toHaveCount(0);

    await page.getByRole("button", { name: "결과 목록 펼치기" }).click();
    await page
      .getByRole("button", { name: "[예시] 시청 국밥 지도에서 보기" })
      .click();
    await page
      .getByTestId("restaurant-preview")
      .getByRole("link", { name: "상세 보기" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "[예시] 시청 국밥" }),
    ).toBeVisible();
    await expect(
      page.getByText("승인된 리뷰 2개 기준이며, 개인의 주관적인 경험이에요."),
    ).toBeVisible();
    await expect(page.getByText("방문 2026.10.01")).toBeVisible();
    await page.getByRole("link", { name: "← 목록으로" }).click();
    await expect(sheetTitle(page)).toHaveText(/식당 \d+곳/);
  });

  test("empty search offers a filter reset", async ({ page }) => {
    await page.goto(Z14);
    await page.getByLabel("식당 이름 또는 주소 검색").fill("존재하지않는식당");
    await page.getByRole("button", { name: "검색", exact: true }).click();
    await expect(sheetTitle(page)).toHaveText("식당 0곳");
    await page.getByRole("button", { name: "결과 목록 펼치기" }).click();
    await expect(page.getByText("조건에 맞는 식당이 없어요.")).toBeVisible();
    await page.getByRole("button", { name: "필터 초기화" }).click();
    await expect(sheetTitle(page)).toHaveText("식당 8곳");
  });

  test.describe("without location permission", () => {
    test.use({ permissions: [] });

    test("still works and explains how to pick an area", async ({ page }) => {
      await page.goto("/?lat=37.56630&lng=126.97790&z=14");
      await page.getByRole("button", { name: "현재 위치로 검색" }).click();
      await expect(page.getByText(/지도를 움직여 지역을/)).toBeVisible();
      await expect(sheetTitle(page)).toHaveText("식당 8곳");
    });
  });

  test("unknown or unpublished restaurants show not found", async ({
    page,
  }) => {
    for (const id of [
      "not-a-uuid",
      "00000000-0000-4000-8000-0000000000ff",
      // Pending seed restaurant.
      "5eed1000-0000-4000-8000-000000000007",
    ]) {
      await page.goto(`/restaurants/${id}`);
      await expect(
        page.getByRole("heading", { name: "식당을 찾을 수 없어요" }),
      ).toBeVisible();
    }
  });
});

test.describe("initial camera (§5A)", () => {
  test("uses an already-granted location and labels distances from it", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      ...testInfo.project.use,
      permissions: ["geolocation"],
      geolocation: { latitude: 37.5655, longitude: 126.9752 },
    });
    const page = await context.newPage();
    await page.goto("/");
    // URL coordinates are written with 5 decimals (37.56550).
    await expect(page).toHaveURL(/lat=37\.56550&lng=126\.97520/);
    await page.getByRole("button", { name: "결과 목록 펼치기" }).click();
    await expect(page.getByText(/내 위치에서/).first()).toBeVisible();
    await context.close();
  });

  test("follows my location from the start when it is granted", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "현재 위치로 검색" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test.describe("location refused", () => {
    test.use({ permissions: [] });

    test("opens at 서울역 (C-82)", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/lat=37\.55470&lng=126\.97070/);
      await expect(
        page.getByRole("button", { name: "현재 위치로 검색" }),
      ).toHaveAttribute("aria-pressed", "false");
    });

    test("prefers the last chosen region over 서울역", async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem(
          "honsikdang:last-region",
          JSON.stringify({ center: { lat: 37.5715, lng: 126.9768 }, zoom: 16 }),
        );
      });
      await page.goto("/");
      await expect(page).toHaveURL(/lat=37\.57150&lng=126\.97680&z=16/);
    });
  });
});
