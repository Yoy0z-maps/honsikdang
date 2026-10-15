import { test } from "@playwright/test";
import { signInWithMagicLink, uniqueEmail } from "./helpers/auth";

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

test("capture place suggestion states (WP-04b)", async ({ page }, testInfo) => {
  const shot = (name: string) =>
    page.screenshot({
      path: `${dir}/WP-04b-${testInfo.project.name}-${name}.png`,
      fullPage: true,
    });

  await page.goto("/suggest?lat=37.56700&lng=126.97900&z=17");
  await signInWithMagicLink(page, uniqueEmail("shot-suggest"));
  await page.getByLabel("식당 이름").waitFor();
  await shot("1-form");

  await page.getByLabel("식당 이름").fill("[예시] 시청 국밥");
  await page.getByLabel("주소").fill("서울 중구 예시로 1");
  await page.getByLabel("음식 종류").selectOption("korean");
  await page.getByRole("button", { name: "장소 제안하기" }).click();
  await page.getByText("이미 등록된 식당이에요.").waitFor();
  await shot("2-blocked");

  await page.getByLabel("식당 이름").fill(`[예시] 스크린샷 ${Date.now()}`);
  await page.getByRole("button", { name: "장소 제안하기" }).click();
  await page.getByText("근처에 비슷한 식당이 있어요.").waitFor();
  await shot("3-needs-confirmation");

  await page.getByLabel("위 식당과 다른 곳이 맞아요").check();
  await page.getByRole("button", { name: "장소 제안하기" }).click();
  await page.getByRole("heading", { name: "장소를 제안했어요" }).waitFor();
  await shot("4-created");
});

test("capture moderation states (WP-04c)", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use });
  const page = await context.newPage();
  const shot = (name: string) =>
    page.screenshot({
      path: `${dir}/WP-04c-${testInfo.project.name}-${name}.png`,
      fullPage: true,
    });

  // Report form on a seed restaurant (synthetic data).
  await page.goto(
    "/login?next=%2Frestaurants%2F5eed1000-0000-4000-8000-000000000001",
  );
  await signInWithMagicLink(page, uniqueEmail("shot-report"));
  const review = page.getByRole("article").first();
  await review.getByLabel(/리뷰 신고$/).click();
  await review.getByLabel("신고 사유").waitFor();
  await shot("1-report-form");

  // Moderator queue (one admin per project, see e2e/moderation.spec.ts).
  await context.clearCookies();
  const admin =
    testInfo.project.name === "mobile-360"
      ? "seed-user-3@example.invalid"
      : "seed-admin-2@example.invalid";
  await page.goto("/login?next=%2Fadmin%3Ftab%3Dreviews");
  await signInWithMagicLink(page, admin);
  await page.getByRole("heading", { name: "검수", exact: true }).waitFor();
  await shot("2-admin-reviews");
  await page.goto("/admin?tab=places");
  await page.getByRole("heading", { name: "검수", exact: true }).waitFor();
  await shot("3-admin-places");
  await context.close();
});

test("capture save and directions states (WP-04d)", async ({
  page,
}, testInfo) => {
  const shot = (name: string, fullPage = false) =>
    page.screenshot({
      path: `${dir}/WP-04d-${testInfo.project.name}-${name}.png`,
      fullPage,
    });
  const detail = "/restaurants/5eed1000-0000-4000-8000-000000000002";

  await page.goto("/?z=14");
  await page.getByRole("button", { name: "결과 목록 펼치기" }).click();
  await page
    .getByRole("button", { name: "[예시] 덕수궁 라멘 지도에서 보기" })
    .click();
  await page.getByTestId("restaurant-preview").waitFor();
  await page.waitForTimeout(300);
  await shot("1-preview-directions");

  await page.goto(detail);
  await page.getByRole("link", { name: "저장", exact: true }).click();
  await signInWithMagicLink(
    page,
    uniqueEmail(`shot-saved-${testInfo.project.name}`),
  );
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await page.getByRole("button", { name: "저장됨" }).waitFor();
  await shot("2-detail-saved");

  await page.goto("/me/saved");
  await page.getByRole("heading", { name: "저장한 식당" }).waitFor();
  await page.getByRole("link", { name: "[예시] 덕수궁 라멘" }).waitFor();
  await shot("3-activity-saved");

  await page.goto("/me/places");
  await page.getByRole("heading", { name: "내 장소 제안" }).waitFor();
  await shot("4-activity-places");
});

test.describe("desktop directions guidance (WP-04d)", () => {
  test.use({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
  });
  test("capture", async ({ page }, testInfo) => {
    await page.goto("/restaurants/5eed1000-0000-4000-8000-000000000002");
    await page.getByRole("button", { name: "길찾기" }).click();
    await page.getByRole("region", { name: "길찾기 안내" }).waitFor();
    await page.screenshot({
      path: `${dir}/WP-04d-${testInfo.project.name}-5-no-app-guidance.png`,
    });
  });
});
