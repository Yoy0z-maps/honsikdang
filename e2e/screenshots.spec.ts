import { test } from "@playwright/test";

// Mobile UX evidence for specs/mobile-ux (master plan §5A agent rule).
// Run explicitly: SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts
// Uses synthetic seed data and no NAVER key (map area shows the fallback).
test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1 to capture");

const dir = "specs/mobile-ux/screenshots";

test("capture map-first states", async ({ page }, testInfo) => {
  const shot = (name: string) =>
    page.screenshot({
      path: `${dir}/WP-03b-${testInfo.project.name}-${name}.png`,
    });

  await page.goto("/?z=14");
  await page.locator("#sheet-title").filter({ hasText: "식당 8곳" }).waitFor();
  await shot("1-home-collapsed");

  await page.getByRole("button", { name: "결과 목록 펼치기" }).click();
  await page.getByRole("link", { name: "[예시] 시청 국밥" }).waitFor();
  await shot("2-sheet-half");

  await page
    .getByRole("button", { name: "[예시] 시청 국밥 지도에서 보기" })
    .click();
  await page.getByTestId("restaurant-preview").waitFor();
  await page.waitForTimeout(300);
  await shot("3-preview");

  await page.getByRole("button", { name: "미리보기 닫기" }).click();
  await page.getByRole("button", { name: "필터 열기" }).click();
  await page.locator("#sheet-title").filter({ hasText: "필터" }).waitFor();
  await page.waitForTimeout(300);
  await shot("4-filters-full");
});
