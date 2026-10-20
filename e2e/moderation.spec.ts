import {
  expect,
  test,
  type Browser,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { signInWithMagicLink, uniqueEmail } from "./helpers/auth";

// Journey B + E end to end. Items are created far from the seed area
// (37.62, 127.00) so discovery tests that count seed restaurants are not
// affected. Local/CI-only moderator from supabase/seed.sql (Q30).
// One moderator per Playwright project: two projects requesting a magic
// link for the same address at once can invalidate each other's link.
const ADMIN_EMAILS: Record<string, string> = {
  "mobile-360": "seed-user-3@example.invalid",
  "mobile-390": "seed-admin-2@example.invalid",
};
const FAR = { lat: "37.62000", lng: "127.00000" };

async function newSignedInPage(
  browser: Browser,
  testInfo: TestInfo,
  email: string,
  next: string,
): Promise<Page> {
  const context = await browser.newContext({ ...testInfo.project.use });
  const page = await context.newPage();
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await signInWithMagicLink(page, email);
  return page;
}

test("signed-out and non-admin users get a 404 for /admin (Q31)", async ({
  page,
  browser,
}, testInfo) => {
  await page.goto("/admin");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "검수", exact: true }),
  ).toHaveCount(0);

  const user = await newSignedInPage(
    browser,
    testInfo,
    uniqueEmail("e2e-not-admin"),
    "/me/reviews",
  );
  await user.goto("/admin");
  await expect(user.getByText("This page could not be found.")).toBeVisible();
  await expect(
    user.getByRole("heading", { name: "검수", exact: true }),
  ).toHaveCount(0);
  await user.context().close();
});

test("suggest → moderate → publish → report → remove, with reasons shown to the author", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const name = `[예시] 검수 e2e ${testInfo.project.name} ${Date.now()}`;
  const author = await newSignedInPage(
    browser,
    testInfo,
    uniqueEmail("e2e-author"),
    `/suggest?lat=${FAR.lat}&lng=${FAR.lng}&z=17`,
  );

  await test.step("author suggests a place and reviews it", async () => {
    await author.getByLabel("식당 이름").fill(name);
    await author.getByLabel("주소").fill("서울 예시구 검수로 1");
    await author.getByLabel("음식 종류").selectOption("bunsik");
    await author.getByRole("button", { name: "장소 제안하기" }).click();
    // The other project (or an earlier local run) may already have a place
    // here, so wait for the outcome and confirm if asked.
    const created = author.getByRole("heading", { name: "장소를 제안했어요" });
    const confirm = author.getByLabel("위 식당과 다른 곳이 맞아요");
    await expect(created.or(confirm)).toBeVisible();
    if (await confirm.isVisible()) {
      await confirm.check();
      await author.getByRole("button", { name: "장소 제안하기" }).click();
    }
    await expect(created).toBeVisible();
    await author.getByRole("link", { name: "이 식당 리뷰도 남기기" }).click();
    await author
      .locator("label")
      .filter({ has: author.getByLabel("별점 5점 (최고예요)") })
      .click();
    await author.getByLabel("4 편함").check();
    await author.getByLabel("바/카운터석").check();
    await author.getByLabel("한 줄 후기 (선택)").fill("검수 e2e 리뷰");
    await author.getByRole("button", { name: "리뷰 등록" }).click();
    await expect(author.getByText("검수 대기")).toBeVisible();
  });

  const admin = await newSignedInPage(
    browser,
    testInfo,
    ADMIN_EMAILS[testInfo.project.name],
    "/admin",
  );

  await test.step("moderator approves the place and the review", async () => {
    await expect(
      admin.getByRole("heading", { name: "검수", exact: true }),
    ).toBeVisible();
    const placeCard = admin.getByRole("listitem").filter({ hasText: name });
    await placeCard.getByRole("button", { name: `${name} 승인` }).click();
    await expect(admin.getByText("승인했어요.")).toBeVisible();

    await admin.goto("/admin?tab=reviews");
    const reviewCard = admin.getByRole("listitem").filter({ hasText: name });
    // Reject without a reason is refused (Q28).
    await reviewCard.getByRole("button", { name: `${name} 리뷰 반려` }).click();
    await expect(admin.getByText("이 동작에는 사유가 필요해요.")).toBeVisible();
    await admin
      .getByRole("listitem")
      .filter({ hasText: name })
      .getByRole("button", { name: `${name} 리뷰 승인` })
      .click();
    await expect(admin.getByText("승인했어요.")).toBeVisible();
  });

  let detailUrl = "";
  await test.step("the place and review are public", async () => {
    await author.goto(
      `/?lat=${FAR.lat}&lng=${FAR.lng}&z=16&q=${encodeURIComponent(name)}`,
    );
    await expect(author.locator("#sheet-title")).toHaveText("식당 1곳");
    await author.getByRole("button", { name: "결과 목록 펼치기" }).click();
    await author.getByRole("link", { name }).click();
    await expect(author.getByText("검수 e2e 리뷰")).toBeVisible();
    detailUrl = new URL(author.url()).pathname;
  });

  const reporter = await newSignedInPage(
    browser,
    testInfo,
    uniqueEmail("e2e-reporter"),
    detailUrl,
  );

  await test.step("another user reports the review", async () => {
    await expect(reporter.getByText("검수 e2e 리뷰")).toBeVisible();
    // The restaurant has its own report form; stay inside the review card.
    const review = reporter
      .getByRole("article")
      .filter({ hasText: "검수 e2e 리뷰" });
    await review.getByLabel(/리뷰 신고$/).click();
    await review.getByLabel("신고 사유").selectOption("inappropriate");
    await review.getByLabel("메모 (선택)").fill("e2e 신고 메모");
    await review.getByRole("button", { name: "신고하기" }).click();
    await expect(
      review.getByText("신고를 접수했어요. 운영자가 확인할게요."),
    ).toBeVisible();
  });

  await test.step("moderator resolves the report by removing the review", async () => {
    await admin.goto("/admin?tab=reports");
    const card = admin
      .getByRole("listitem")
      .filter({ hasText: name })
      .filter({ hasText: "e2e 신고 메모" });
    await card
      .getByLabel("대상 조치", { exact: true })
      .selectOption("remove_review");
    await card.getByLabel(/^사유/).fill("신고 확인: 부적절한 내용");
    await card.getByRole("button", { name: /신고 해결$/ }).click();
    await expect(admin.getByText("신고를 해결했어요.")).toBeVisible();
  });

  await test.step("the review is gone and the author sees why", async () => {
    await reporter.goto(detailUrl);
    await expect(
      reporter.getByText("아직 승인된 혼밥 리뷰가 없어요."),
    ).toBeVisible();
    await author.goto("/me/reviews");
    const item = author.getByRole("listitem").filter({ hasText: name });
    await expect(item).toContainText("운영자가 비공개 처리함");
    await expect(item).toContainText("운영자 사유: 신고 확인: 부적절한 내용");
  });

  await test.step("moderation screens are touch-friendly", async () => {
    await admin.goto("/admin");
    const overflow = await admin.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const tab = await admin
      .getByRole("link", { name: /대기 리뷰/ })
      .boundingBox();
    expect(tab!.height).toBeGreaterThanOrEqual(44);
  });

  for (const page of [author, admin, reporter]) await page.context().close();
});
