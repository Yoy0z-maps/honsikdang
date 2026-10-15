import { expect, test } from "@playwright/test";

// Depends on supabase/seed.sql (synthetic, local-only data around 서울시청).

test.describe("discovery (mobile)", () => {
  test("lists nearby approved restaurants with a map fallback", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "식당 6곳" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "[예시] 시청 국밥" }),
    ).toBeVisible();
    // Pending seed restaurant must not appear.
    await expect(page.getByText("[예시] 종로 김밥")).toHaveCount(0);
    await expect(
      page.getByText("지도를 불러올 수 없어요. 목록에서 식당을 확인해 주세요."),
    ).toBeVisible();
  });

  test("has no horizontal overflow on a phone", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "식당 6곳" })).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("category filter updates results and the URL, and survives reload", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "일식" }).click();
    await expect(page).toHaveURL(/\?cat=japanese$/);
    await expect(page.getByRole("heading", { name: "식당 2곳" })).toBeVisible();
    await expect(page.getByRole("button", { name: "일식" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.reload();
    await expect(page.getByRole("heading", { name: "식당 2곳" })).toBeVisible();
  });

  test("budget filter excludes and reports restaurants without prices", async ({
    page,
  }) => {
    await page.goto("/?radius=5000");
    await page.getByLabel("1인 예산").selectOption("10000");
    await expect(page.getByRole("heading", { name: "식당 4곳" })).toBeVisible();
    await expect(
      page.getByText("가격 정보가 없는 2곳은 예산 필터에서 제외했어요."),
    ).toBeVisible();
  });

  test("empty search offers a filter reset", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("식당 이름 또는 주소 검색").fill("존재하지않는식당");
    await page.getByRole("button", { name: "검색" }).click();
    await expect(page.getByText("조건에 맞는 식당이 없어요.")).toBeVisible();
    await page.getByRole("button", { name: "필터 초기화" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "식당 6곳" })).toBeVisible();
  });

  test("opens a restaurant detail with dated reviews", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "[예시] 시청 국밥" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "[예시] 시청 국밥" }),
    ).toBeVisible();
    await expect(
      page.getByText("승인된 리뷰 2개 기준이며, 개인의 주관적인 경험이에요."),
    ).toBeVisible();
    await expect(page.getByText("방문 2026.10.01")).toBeVisible();
    await page.getByRole("link", { name: "← 목록으로" }).click();
    await expect(page.getByRole("heading", { name: "식당 6곳" })).toBeVisible();
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
