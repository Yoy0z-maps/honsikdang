import { expect, test, type Page } from "@playwright/test";
import { E2E_JOB_SECRET } from "../playwright.config";
import { signInWithMagicLink, uniqueEmail } from "./helpers/auth";

// Relevance ordering (WP-05b) with the fixture embedder. Seed: "[예시] 명동
// 쌀국수" (~650 m from the default center) has the review "조용한 편이다";
// "[예시] 시청 국밥" is the nearest restaurant.
const QUIET = "/?z=14&sem=" + encodeURIComponent("조용한 편이다");

function cardNames(page: Page) {
  return page.getByRole("list").first().getByRole("heading", { level: 3 });
}

test.beforeAll(async ({ request }) => {
  const res = await request.post("/api/jobs/embeddings", {
    headers: { authorization: `Bearer ${E2E_JOB_SECRET}` },
  });
  expect(res.status()).toBe(200);
  expect((await res.json()).failed).toBe(0);
});

test("the job route rejects callers without the secret", async ({
  request,
}) => {
  const res = await request.post("/api/jobs/embeddings", {
    headers: { authorization: "Bearer wrong-secret-wrong-secret" },
  });
  expect(res.status()).toBe(401);
});

test("signed-out visitors keep distance order with an explanation", async ({
  page,
}) => {
  await page.goto(QUIET);
  await page.getByRole("button", { name: "결과 목록 펼치기" }).click();
  await expect(page.getByTestId("relevance-note")).toContainText("거리순으로");
  await expect(cardNames(page).first()).toHaveText("[예시] 시청 국밥");
});

test.describe("signed in", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login?next=/?z=14");
    await signInWithMagicLink(page, uniqueEmail("e2e-relevance"));
    await expect(page).toHaveURL("/?z=14");
  });

  test("re-orders the same results by relevance and can switch back", async ({
    page,
  }) => {
    await page.goto(QUIET);
    await page.getByRole("button", { name: "결과 목록 펼치기" }).click();
    const note = page.getByTestId("relevance-note");
    await expect(note).toContainText("관련도순");
    await expect(cardNames(page).first()).toHaveText("[예시] 명동 쌀국수");
    // Re-ranking never changes how many restaurants match.
    await expect(page.locator("#sheet-title")).toHaveText("식당 8곳");

    await note.getByRole("button", { name: "거리순" }).click();
    await expect(page.getByTestId("relevance-note")).toHaveCount(0);
    await expect(cardNames(page).first()).toHaveText("[예시] 시청 국밥");
    expect(new URL(page.url()).searchParams.has("sem")).toBe(false);
  });

  test("AI search carries a soft preference into relevance order", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "AI로 찾기" }).click();
    await page
      .getByLabel("AI 검색: 원하는 식당을 문장으로 입력")
      .fill("혼자 먹기 편한 곳");
    await page.getByRole("button", { name: "검색", exact: true }).click();
    await expect(page.getByTestId("ai-notice")).toContainText(
      "‘혼자 먹기 편한’에 가까운 곳부터 보여 줘요.",
    );
    await expect
      .poll(() => new URL(page.url()).searchParams.get("sem"))
      .toBe("혼자 먹기 편한");
  });
});
