import { expect, test, type Page } from "@playwright/test";

// "오늘 뭐 먹지?" (WP-06) against the synthetic seed (8 approved places in
// view at z=14). Works without signing in (Q61).

async function open(page: Page) {
  await page.goto("/?z=14");
  await page.locator("#sheet-title").filter({ hasText: "식당" }).waitFor();
  await page.getByRole("button", { name: "오늘 뭐 먹지?" }).click();
  await expect(page.locator("#sheet-title")).toHaveText("오늘 뭐 먹지?");
}

const picks = (page: Page) => page.getByTestId("rec-pick");

async function pickNames(page: Page) {
  // textContent: innerText puts the screen-reader-only "N번 추천:" prefix on
  // its own line.
  return picks(page).getByRole("heading", { level: 4 }).allTextContents();
}

test.describe("오늘 뭐 먹지 (mobile)", () => {
  test("recommends 3 different kinds of places with grounded reasons", async ({
    page,
  }) => {
    await open(page);
    const submit = await page
      .getByRole("button", { name: "3곳 추천 받기" })
      .boundingBox();
    expect(submit?.height).toBeGreaterThanOrEqual(44);
    // Reachable without scrolling the sheet (categories are folded).
    await expect(
      page.getByRole("button", { name: "3곳 추천 받기" }),
    ).toBeInViewport({ ratio: 1 });
    await page.getByRole("button", { name: "3곳 추천 받기" }).click();
    await expect(picks(page)).toHaveCount(3);
    // Picks come first: the first one is on screen right away.
    await expect(picks(page).first()).toBeInViewport();

    const names = await pickNames(page);
    expect(names[0]).toMatch(/^1번 추천: \[예시\] /);
    const kinds = await Promise.all(
      [0, 1, 2].map((i) => picks(page).nth(i).locator("p").first().innerText()),
    );
    expect(new Set(kinds.map((k) => k.split(/\s/)[0])).size).toBe(3);

    // Every reason is one of the grounded templates; nothing else is said.
    const reasons = await picks(page)
      .getByRole("list", { name: "추천 이유" })
      .getByRole("listitem")
      .allInnerTexts();
    for (const reason of reasons) {
      expect(reason).toMatch(
        /^(혼밥 편안함 \d\.\d\/5 \(리뷰 \d+개\)|아직 승인된 리뷰가 없어요|'.+' 관련 특성이 리뷰에 있어요|1인 약 [\d,]+원 \(중앙값\)|가격 정보가 없어 예산을 확인하지 못했어요|최근 방문 \d{4}\.\d{2}\.\d{2}|지도 중심에서 [\d.]+k?m)$/,
      );
    }

    for (const name of ["다른 추천 보기", "조건 바꾸기"]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("never breaks the budget or an excluded kind", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "7,000원 이하" }).click();
    await page.getByText("음식 종류 고르기").click();
    await page.getByRole("button", { name: "한식 빼기" }).click();
    await page.getByRole("button", { name: "3곳 추천 받기" }).click();
    await expect(picks(page).first()).toBeVisible();

    const count = await picks(page).count();
    for (let i = 0; i < count; i++) {
      const card = picks(page).nth(i);
      await expect(card.locator("p").first()).not.toContainText("한식");
      const price = await card.getByText(/^1인 약 [\d,]+원/).allInnerTexts();
      for (const p of price) {
        const won = Number(/약 ([\d,]+)원/.exec(p)![1].replace(/,/g, ""));
        expect(won).toBeLessThanOrEqual(7000);
      }
    }
    // With so few cheap places, the shortfall is explained.
    if (count < 3) {
      await expect(page.getByTestId("rec-shortfall")).toContainText(
        "예산을 넘는",
      );
    }
  });

  test("pass and '다른 추천 보기' never repeat a place, then explain the end", async ({
    page,
  }) => {
    await open(page);
    await page.getByRole("button", { name: "3곳 추천 받기" }).click();
    await expect(picks(page)).toHaveCount(3);
    const strip = (names: string[]) =>
      names.map((n) => n.replace(/^\d번 추천: /, ""));
    const shown = new Set(strip(await pickNames(page)));

    const first = strip(await pickNames(page))[0];
    await page
      .getByRole("button", { name: `${first} 패스하고 다른 곳 보기` })
      .click();
    await expect(
      page.getByRole("heading", {
        name: new RegExp(first.replace(/[[\]]/g, "\$&")),
      }),
    ).toHaveCount(0);
    for (const n of strip(await pickNames(page))) shown.add(n);

    await page.getByRole("button", { name: "다른 추천 보기" }).click();
    const next = strip(await pickNames(page));
    for (const n of next) expect(shown.has(n)).toBe(false);

    // 8 places in view: after a few rounds the list runs out and says why.
    for (let i = 0; i < 4 && (await picks(page).count()) > 0; i++) {
      await page.getByRole("button", { name: "다른 추천 보기" }).click();
    }
    await expect(page.getByTestId("rec-shortfall")).toContainText(
      "이미 본 추천은 다시 보여 주지 않아요",
    );

    // The folded form summarizes the conditions and can be reopened.
    await page.getByRole("button", { name: "조건 바꾸기" }).click();
    await expect(
      page.getByRole("button", { name: "3곳 추천 받기" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "결과 목록으로 돌아가기" }).click();
    await expect(page.locator("#sheet-title")).toHaveText(/식당 \d+곳/);
  });
});
