import { expect, test, type Page } from "@playwright/test";
import { signInWithMagicLink, uniqueEmail } from "./helpers/auth";

// Runs against the fixture parser (AI_PROVIDER=fixture in
// playwright.config.ts), never the real model.

async function aiSearch(page: Page, text: string) {
  await page.getByRole("button", { name: "AI로 찾기" }).click();
  await page.getByLabel("AI 검색: 원하는 식당을 문장으로 입력").fill(text);
  await page.getByRole("button", { name: "검색", exact: true }).click();
}

test.describe("AI search (mobile)", () => {
  test("signed-out users are asked to log in and keep normal search", async ({
    page,
  }) => {
    await page.goto("/?z=14");
    await aiSearch(page, "조용한 라멘집");
    const notice = page.getByTestId("ai-notice");
    await expect(notice).toContainText("AI 검색은 로그인하면 쓸 수 있어요.");
    await notice.getByRole("link", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2F%3Fz%3D14/);
  });

  test.describe("signed in", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login?next=/?z=14");
      await signInWithMagicLink(page, uniqueEmail("e2e-ai"));
      await expect(page).toHaveURL("/?z=14");
    });

    test("applies interpreted conditions as editable filters", async ({
      page,
    }) => {
      await aiSearch(page, "강남역 만 원 이하 조용한 라멘 영업 중");
      const notice = page.getByTestId("ai-notice");
      await expect(notice).toContainText("AI가 이렇게 이해했어요");
      const applied = notice.getByRole("list", { name: "적용한 조건" });
      await expect(applied.getByRole("listitem")).toHaveText([
        "일식",
        "1인 10,000원 이하",
        "조용함",
      ]);
      await expect(notice).toContainText("‘강남역’ 위치는 찾지 않아요.");
      await expect(notice).toContainText("반영하지 못한 조건: 영업 중");

      await expect(page).toHaveURL(/cat=japanese/);
      await expect(page).toHaveURL(/max=10000/);
      await expect(page).toHaveURL(/tags=quiet/);
      await expect(
        page.getByRole("button", { name: "필터, 3개 적용 중" }),
      ).toBeVisible();

      const box = await page
        .getByRole("button", { name: "AI로 찾기" })
        .boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      await notice.getByRole("button", { name: "AI 검색 안내 닫기" }).click();
      await expect(notice).toHaveCount(0);
    });

    for (const [text, message] of [
      ["오류응답 국밥", "AI 해석에 실패해 입력한 말로 일반 검색했어요."],
      [
        "이상한응답 국밥",
        "AI가 검색어를 이해하지 못해 입력한 말로 일반 검색했어요.",
      ],
      ["느린응답 국밥", "AI 해석이 늦어져 입력한 말로 일반 검색했어요."],
    ] as const) {
      test(`falls back to keyword search: ${text}`, async ({ page }) => {
        // Conditions from an earlier search must not linger.
        await page.goto("/?z=14&cat=japanese&tags=quiet");
        await aiSearch(page, text);
        await expect(page.getByTestId("ai-notice")).toContainText(message, {
          timeout: 10_000,
        });
        await expect
          .poll(() => new URL(page.url()).searchParams.get("q"))
          .toBe(text);
        expect(new URL(page.url()).searchParams.has("cat")).toBe(false);
        expect(new URL(page.url()).searchParams.has("tags")).toBe(false);
      });
    }
  });
});
