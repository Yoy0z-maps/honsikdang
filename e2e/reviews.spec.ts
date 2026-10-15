import { expect, test } from "@playwright/test";
import { signInWithMagicLink, uniqueEmail } from "./helpers/auth";

// Depends on supabase/seed.sql: "[예시] 서소문 중식" is approved with no reviews.
const RESTAURANT_ID = "5eed1000-0000-4000-8000-000000000005";
const RESTAURANT = "[예시] 서소문 중식";

test.describe("review contribution (mobile)", () => {
  test("anonymous visitors are sent to login before writing a review", async ({
    page,
  }) => {
    await page.goto(`/restaurants/${RESTAURANT_ID}`);
    await page.getByRole("link", { name: "리뷰 쓰기" }).click();
    await expect(page).toHaveURL(
      `/login?next=${encodeURIComponent(`/restaurants/${RESTAURANT_ID}/review`)}`,
    );
  });

  test("login ignores an external next parameter", async ({ page }) => {
    await page.goto("/login?next=https://evil.example/");
    await expect(page.locator('input[name="next"]')).toHaveValue("/");
  });

  test("an invalid magic link explains the failure", async ({ page }) => {
    await page.goto("/auth/confirm?token_hash=invalid&type=email&next=/");
    await expect(page).toHaveURL(/\/login\?error=link/);
    await expect(
      page.getByText("로그인 링크가 만료되었거나 이미 사용되었어요."),
    ).toBeVisible();
  });

  test("sign in, write, edit and delete a review", async ({ page }) => {
    await page.goto(`/restaurants/${RESTAURANT_ID}/review`);
    await signInWithMagicLink(page, uniqueEmail("e2e-review"));

    await test.step("lands back on the review form", async () => {
      await expect(page).toHaveURL(`/restaurants/${RESTAURANT_ID}/review`);
      await expect(
        page.getByRole("heading", { level: 1, name: RESTAURANT }),
      ).toBeVisible();
    });

    await test.step("submits a structured review", async () => {
      await page.getByLabel("4 편함").check();
      await page.getByLabel("바/카운터석").check();
      await page.getByLabel("가능").check();
      await page.getByLabel("1인 지출(원)").fill("8000");
      await page.getByLabel("1인석").check();
      await page.getByLabel("한 줄 후기 (선택)").fill("e2e 테스트 리뷰");
      await page.getByRole("button", { name: "리뷰 등록" }).click();

      await expect(page).toHaveURL("/me/reviews?saved=created");
      await expect(
        page.getByText("리뷰를 등록했어요. 검수 후 공개돼요."),
      ).toBeVisible();
      await expect(page.getByText("검수 대기")).toBeVisible();
    });

    await test.step("pending review is not public", async () => {
      await page.goto(`/restaurants/${RESTAURANT_ID}`);
      await expect(
        page.getByText("아직 승인된 혼밥 리뷰가 없어요."),
      ).toBeVisible();
    });

    await test.step("a second review redirects to editing the first", async () => {
      await page.goto(`/restaurants/${RESTAURANT_ID}/review`);
      await expect(page).toHaveURL(/\/me\/reviews\/[0-9a-f-]+\/edit$/);
      await expect(page.getByLabel("1인 지출(원)")).toHaveValue("8000");
      await expect(page.getByLabel("1인석")).toBeChecked();
    });

    await test.step("edits the review", async () => {
      await page.getByLabel("1인 지출(원)").fill("9000");
      await page.getByRole("button", { name: "수정 저장" }).click();
      await expect(page).toHaveURL("/me/reviews?saved=updated");
      await expect(
        page.getByText("리뷰를 수정했어요. 다시 검수 후 공개돼요."),
      ).toBeVisible();
    });

    await test.step("deletes the review", async () => {
      page.once("dialog", (dialog) => dialog.accept());
      await page
        .getByRole("button", { name: `${RESTAURANT} 리뷰 삭제` })
        .click();
      await expect(page).toHaveURL("/me/reviews?saved=deleted");
      await expect(page.getByText("아직 쓴 리뷰가 없어요.")).toBeVisible();
    });

    await test.step("signs out", async () => {
      await page.getByRole("button", { name: "로그아웃" }).click();
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("link", { name: "로그인" })).toBeVisible();
    });
  });

  test("server-side validation keeps entered values", async ({ page }) => {
    await page.goto(`/restaurants/${RESTAURANT_ID}/review`);
    await signInWithMagicLink(page, uniqueEmail("e2e-validate"));
    await expect(page).toHaveURL(`/restaurants/${RESTAURANT_ID}/review`);

    await page.getByLabel("3 보통").check();
    await page.getByLabel("칸막이석").check();
    await page.getByLabel("1인 지출(원)").fill("-500");
    await page.getByRole("button", { name: "리뷰 등록" }).click();

    await expect(
      page.getByText("가격은 0~1,000,000원 사이로 입력해 주세요."),
    ).toBeVisible();
    await expect(page.getByLabel("1인 지출(원)")).toHaveValue("-500");
    await expect(page.getByLabel("칸막이석")).toBeChecked();
  });
});
