import { test } from "@playwright/test";
import { E2E_JOB_SECRET } from "../playwright.config";
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

test("capture AI search states (WP-05a)", async ({ page }, testInfo) => {
  const shot = (name: string) =>
    page.screenshot({
      path: `${dir}/WP-05a-${testInfo.project.name}-${name}.png`,
    });
  await page.goto("/login?next=/?z=14");
  await signInWithMagicLink(
    page,
    uniqueEmail(`shot-ai-${testInfo.project.name}`),
  );
  await page.locator("#sheet-title").filter({ hasText: "식당" }).waitFor();

  await page.getByRole("button", { name: "AI로 찾기" }).click();
  await page
    .getByLabel("AI 검색: 원하는 식당을 문장으로 입력")
    .fill("강남역 만 원 이하 조용한 라멘 영업 중");
  await shot("1-ai-input");

  await page.getByRole("button", { name: "검색", exact: true }).click();
  await page
    .getByTestId("ai-notice")
    .getByText("AI가 이렇게 이해했어요")
    .waitFor();
  await page.waitForTimeout(300);
  await shot("2-ai-interpreted");

  await page
    .getByLabel("AI 검색: 원하는 식당을 문장으로 입력")
    .fill("오류응답 국밥");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await page.getByTestId("ai-notice").getByText("AI 해석에 실패해").waitFor();
  await page.waitForTimeout(300);
  await shot("3-ai-fallback");
});

test("capture relevance ordering (WP-05b)", async ({
  page,
  request,
}, testInfo) => {
  const shot = (name: string) =>
    page.screenshot({
      path: `${dir}/WP-05b-${testInfo.project.name}-${name}.png`,
    });
  await request.post("/api/jobs/embeddings", {
    headers: { authorization: `Bearer ${E2E_JOB_SECRET}` },
  });
  await page.goto("/login?next=/?z=14");
  await signInWithMagicLink(
    page,
    uniqueEmail(`shot-rel-${testInfo.project.name}`),
  );
  await page.locator("#sheet-title").filter({ hasText: "식당" }).waitFor();

  await page.getByRole("button", { name: "AI로 찾기" }).click();
  await page
    .getByLabel("AI 검색: 원하는 식당을 문장으로 입력")
    .fill("혼자 먹기 편한 곳");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await page.getByTestId("ai-notice").getByText("가까운 곳부터").waitFor();
  await page.waitForTimeout(300);
  await shot("1-ai-semantic");

  await page.goto("/?z=14&sem=" + encodeURIComponent("조용한 편이다"));
  await page.getByRole("button", { name: "결과 목록 펼치기" }).click();
  await page.getByTestId("relevance-note").waitFor();
  await page.waitForTimeout(300);
  await shot("2-relevance-list");
});

test("capture grounded evidence (WP-05c)", async ({
  page,
  request,
}, testInfo) => {
  const shot = (name: string) =>
    page.screenshot({
      path: `${dir}/WP-05c-${testInfo.project.name}-${name}.png`,
    });
  await request.post("/api/jobs/embeddings", {
    headers: { authorization: `Bearer ${E2E_JOB_SECRET}` },
  });
  await page.goto("/login?next=/?z=14");
  await signInWithMagicLink(
    page,
    uniqueEmail(`shot-ev-${testInfo.project.name}`),
  );
  await page.locator("#sheet-title").filter({ hasText: "식당" }).waitFor();

  await page.goto("/?z=14&sem=" + encodeURIComponent("조용한 편이다"));
  await page.getByRole("button", { name: "결과 목록 펼치기" }).click();
  await page.getByTestId("evidence").first().waitFor();
  await page.waitForTimeout(300);
  await shot("1-evidence-list");

  await page.getByTestId("evidence").first().getByRole("link").click();
  await page.waitForURL(/#review-/);
  await page.waitForTimeout(300);
  await shot("2-evidence-review");
});

test("capture launch pages (WP-07)", async ({ page }, testInfo) => {
  const shot = (name: string) =>
    page.screenshot({
      path: `${dir}/WP-07-${testInfo.project.name}-${name}.png`,
    });
  await page.goto("/login");
  await shot("1-login-consent");
  await page.goto("/privacy");
  await shot("2-privacy");
  await page
    .getByRole("heading", { name: "4. 처리 위탁과 국외 이전" })
    .scrollIntoViewIfNeeded();
  await shot("3-privacy-table");
  await page.goto("/login?next=/me/account");
  await signInWithMagicLink(
    page,
    uniqueEmail(`shot-acct-${testInfo.project.name}`),
  );
  await page.getByRole("heading", { name: "계정 삭제" }).waitFor();
  await shot("4-account");
});

test("capture today's recommendation (WP-06)", async ({ page }, testInfo) => {
  const shot = (name: string, fullPage = false) =>
    page.screenshot({
      path: `${dir}/WP-06-${testInfo.project.name}-${name}.png`,
      fullPage,
    });
  await page.goto("/?z=14");
  await page.locator("#sheet-title").filter({ hasText: "식당" }).waitFor();
  await page.getByRole("button", { name: "오늘 뭐 먹지?" }).click();
  await page.getByRole("button", { name: "조용히" }).click();
  await page.getByRole("button", { name: "10,000원 이하" }).click();
  await page.waitForTimeout(300);
  await shot("1-inputs");

  await page.getByRole("button", { name: "3곳 추천 받기" }).click();
  await page.getByTestId("rec-pick").first().waitFor();
  await page.getByTestId("rec-pick").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot("2-picks");

  for (let i = 0; i < 4; i++) {
    if ((await page.getByTestId("rec-pick").count()) === 0) break;
    await page.getByRole("button", { name: "다른 추천 보기" }).click();
  }
  await page.getByTestId("rec-shortfall").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot("3-shortfall");
});

test("capture WP-08 upgrades", async ({ page }, testInfo) => {
  const shot = (name: string, fullPage = false) =>
    page.screenshot({
      path: `${dir}/WP-08-${testInfo.project.name}-${name}.png`,
      fullPage,
    });
  // Location is granted in the config: the map opens at my position.
  await page.goto("/");
  await page.locator("#sheet-title").filter({ hasText: "식당" }).waitFor();
  await page.waitForTimeout(300);
  await shot("1-start-at-my-location");

  await page.goto("/restaurants/5eed1000-0000-4000-8000-000000000001");
  await page.getByRole("heading", { name: "메뉴 가격" }).waitFor();
  await shot("2-detail-rating-menu", true);

  await page.goto("/restaurants/5eed1000-0000-4000-8000-000000000010/review");
  await signInWithMagicLink(
    page,
    uniqueEmail(`shot-rating-${testInfo.project.name}`),
  );
  await page
    .locator("label")
    .filter({ has: page.getByLabel("별점 4점 (좋아요)") })
    .click();
  await page.getByLabel("메뉴 1 이름").fill("연어 샐러드");
  await page.getByLabel("메뉴 1 가격(원)").fill("12900");
  await page.getByLabel("메뉴 1 이름").scrollIntoViewIfNeeded();
  await shot("3-review-rating-menu");

  await page.goto("/suggest?lat=37.56700&lng=126.97900&z=17");
  await page.getByLabel("식당 검색어").fill("혼밥테스트");
  await page.getByLabel("식당 검색어").press("Enter");
  await page.getByRole("list", { name: "검색 결과" }).waitFor();
  await shot("4-suggest-search-results");
  await page
    .getByRole("list", { name: "검색 결과" })
    .getByRole("button", { name: /혼밥테스트라멘/ })
    .click();
  await page.getByLabel("음식 종류").scrollIntoViewIfNeeded();
  await shot("5-suggest-filled");
});
