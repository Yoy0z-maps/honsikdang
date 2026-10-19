import { expect, test } from "@playwright/test";
import { signInWithMagicLink, uniqueEmail } from "./helpers/auth";

// WP-07: legal pages, consent notice, account deletion (C-73), job auth.

test("legal pages are readable on a phone without page overflow", async ({
  page,
}) => {
  for (const [path, heading] of [
    ["/privacy", "개인정보처리방침"],
    ["/terms", "이용약관"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
    await expect(
      page.getByText("work.johnhan@gmail.com").first(),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }
});

test("login shows the terms and privacy links", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "개인정보처리방침" }).click();
  await expect(page).toHaveURL("/privacy");
});

test("the daily job rejects calls without the cron secret", async ({
  request,
}) => {
  const res = await request.get("/api/jobs/daily", {
    headers: { authorization: "Bearer not-the-cron-secret-123" },
  });
  expect(res.status()).toBe(401);
});

test("deleting an account signs out and keeps no personal data reachable", async ({
  page,
}) => {
  await page.goto("/login?next=/me/account");
  await signInWithMagicLink(page, uniqueEmail("e2e-delete"));
  await expect(page).toHaveURL("/me/account");
  await expect(page.getByRole("heading", { name: "계정 삭제" })).toBeVisible();

  await page.getByLabel("계속하려면 ‘삭제’라고 입력해 주세요").fill("아니요");
  await page.getByRole("button", { name: "계정 삭제" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "확인을 위해 '삭제'라고 입력해 주세요.",
  );

  await page.getByLabel("계속하려면 ‘삭제’라고 입력해 주세요").fill("삭제");
  await page.getByRole("button", { name: "계정 삭제" }).click();
  // Deleting an auth user with its cascades is the slowest action here.
  await expect(page).toHaveURL("/account-deleted", { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "계정을 삭제했어요" }),
  ).toBeVisible();

  // The session is gone: personal pages ask for login again.
  await page.goto("/me/saved");
  await expect(page).toHaveURL(/\/login\?next=%2Fme%2Fsaved/);
});
