import { expect, test, type Page } from "@playwright/test";
import { signInWithMagicLink, uniqueEmail } from "./helpers/auth";

// Depends on supabase/seed.sql: "[예시] 덕수궁 라멘" is approved.
const RESTAURANT_ID = "5eed1000-0000-4000-8000-000000000002";
const RESTAURANT = "[예시] 덕수궁 라멘";
const DETAIL = `/restaurants/${RESTAURANT_ID}`;

async function expectTouchTarget(page: Page, name: string | RegExp) {
  const box = await page
    .getByRole("main")
    .getByRole("link", { name })
    .or(page.getByRole("main").getByRole("button", { name }))
    .first()
    .boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("save and directions (mobile, Android UA)", () => {
  test("directions open the NAVER Map app with only the destination", async ({
    page,
  }) => {
    await page.goto(DETAIL);
    const link = page.getByTestId("directions");
    await expect(link).toHaveAttribute("href", /^intent:\/\/route\/walk\?/);
    const href = (await link.getAttribute("href"))!;
    const query = new URLSearchParams(href.split("?")[1].split("#")[0]);
    expect(query.get("dlat")).toBe("37.5655000");
    expect(query.get("dlng")).toBe("126.9752000");
    expect(query.get("dname")).toBe(RESTAURANT);
    expect(query.get("appname")).toMatch(/^http:\/\/localhost:\d+$/);
    expect(query.has("slat")).toBe(false);
    expect(href).toContain("package=com.nhn.android.nmap;end");

    for (const name of ["← 목록으로", "길찾기", "저장"]) {
      await expectTouchTarget(page, name);
    }
    await expectNoHorizontalOverflow(page);
  });

  test("anonymous visitors are sent to login before saving", async ({
    page,
  }) => {
    await page.goto(DETAIL);
    await page.getByRole("link", { name: "저장", exact: true }).click();
    await expect(page).toHaveURL(`/login?next=${encodeURIComponent(DETAIL)}`);
  });

  test("save, list under 내 활동, and unsave", async ({ page }) => {
    await page.goto(DETAIL);
    await page.getByRole("link", { name: "저장", exact: true }).click();
    await signInWithMagicLink(page, uniqueEmail("e2e-saved"));
    await expect(page).toHaveURL(DETAIL);

    const save = page.getByRole("button", { name: "저장", exact: true });
    await expect(save).toHaveAttribute("aria-pressed", "false");
    await save.click();
    await expect(page.getByRole("button", { name: "저장됨" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await test.step("the state survives a reload", async () => {
      await page.reload();
      await expect(page.getByRole("button", { name: "저장됨" })).toBeVisible();
    });

    await test.step("the map's account button leads to 내 활동", async () => {
      await page.goto("/?z=14");
      await page.getByRole("link", { name: "내 활동" }).click();
      await expect(page).toHaveURL("/me/reviews");
      await page
        .getByRole("navigation", { name: "내 활동" })
        .getByRole("link", { name: "저장", exact: true })
        .click();
      await expect(page).toHaveURL("/me/saved");
      await expect(
        page
          .getByRole("navigation", { name: "내 활동" })
          .getByRole("link", { name: "저장", exact: true }),
      ).toHaveAttribute("aria-current", "page");
    });

    await test.step("the saved list shows the place", async () => {
      await expect(page.getByRole("link", { name: RESTAURANT })).toBeVisible();
      await expect(page.getByText("서울 중구 예시로 2")).toBeVisible();
      await expect(page.getByTestId("directions")).toHaveAttribute(
        "href",
        /^intent:\/\/route\/walk\?/,
      );
      await expectNoHorizontalOverflow(page);
    });

    await test.step("unsave from the list", async () => {
      await page.getByRole("button", { name: "저장됨" }).click();
      await expect(
        page.getByRole("button", { name: "저장", exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(page.getByText("아직 저장한 식당이 없어요.")).toBeVisible();
    });
  });

  test("the map preview offers directions next to 상세 보기", async ({
    page,
  }) => {
    await page.goto("/?z=14");
    await page.getByRole("button", { name: "결과 목록 펼치기" }).click();
    await page
      .getByRole("button", { name: `${RESTAURANT} 지도에서 보기` })
      .click();
    const preview = page.getByTestId("restaurant-preview");
    await expect(preview.getByTestId("directions")).toHaveAttribute(
      "href",
      /^intent:\/\/route\/walk\?dlat=37\.5655000&dlng=126\.9752000&/,
    );
    await expect(
      preview.getByRole("link", { name: "상세 보기" }),
    ).toBeVisible();
  });
});

test.describe("directions on desktop", () => {
  test.use({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    permissions: ["clipboard-read", "clipboard-write"],
  });

  test("explains the app requirement and copies the address", async ({
    page,
  }) => {
    await page.goto(DETAIL);
    const button = page.getByRole("button", { name: "길찾기" });
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await button.click();
    const help = page.getByRole("region", { name: "길찾기 안내" });
    await expect(help).toContainText("네이버 지도 앱이 설치된 휴대폰");
    await help.getByRole("button", { name: "주소 복사" }).click();
    await expect(help.getByRole("status")).toHaveText("주소를 복사했어요.");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "서울 중구 예시로 2",
    );
    await expectNoHorizontalOverflow(page);
  });
});
