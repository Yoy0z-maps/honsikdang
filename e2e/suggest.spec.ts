import { expect, test } from "@playwright/test";
import { signInWithMagicLink, uniqueEmail } from "./helpers/auth";

// Seed: "[예시] 시청 국밥" (approved) sits exactly at 37.5670, 126.9790.
// Without a NAVER key the pin position is the initial map center.
const AT_SICHEONG = "/suggest?lat=37.56700&lng=126.97900&z=17";

test.describe("place suggestion (mobile)", () => {
  test("the map control sends anonymous users to login first", async ({
    page,
  }) => {
    await page.goto("/?z=14");
    await page.getByRole("link", { name: "장소 제안" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fsuggest%3Flat%3D/);
  });

  test("blocked duplicate, confirmed near-duplicate, then pending and private", async ({
    page,
  }) => {
    await page.goto(AT_SICHEONG);
    await signInWithMagicLink(page, uniqueEmail("e2e-suggest"));
    await expect(page).toHaveURL(AT_SICHEONG);
    await expect(
      page.getByRole("heading", { name: "장소 제안" }),
    ).toBeVisible();
    await expect(
      page.getByText(/지금 보던 지도 중심 위치로 제안돼요/),
    ).toBeVisible();

    await test.step("same name at the same spot is blocked", async () => {
      await page.getByLabel("식당 이름").fill("[예시] 시청 국밥");
      await page.getByLabel("주소").fill("서울 중구 예시로 1");
      await page.getByLabel("음식 종류").selectOption("korean");
      await page.getByRole("button", { name: "장소 제안하기" }).click();
      await expect(page.getByText("이미 등록된 식당이에요.")).toBeVisible();
      await expect(
        page.getByRole("link", { name: "이 식당에 리뷰 쓰기" }),
      ).toHaveAttribute(
        "href",
        "/restaurants/5eed1000-0000-4000-8000-000000000001/review",
      );
      // Values are kept and the user can try again.
      await expect(page.getByLabel("식당 이름")).toHaveValue(
        "[예시] 시청 국밥",
      );
      await expect(
        page.getByRole("button", { name: "장소 제안하기" }),
      ).toBeEnabled();
    });

    const name = `[예시] e2e ${Date.now()} 국수`;
    await test.step("a different name within 20 m needs confirmation", async () => {
      await page.getByLabel("식당 이름").fill(name);
      await page.getByRole("button", { name: "장소 제안하기" }).click();
      await expect(
        page.getByText("근처에 비슷한 식당이 있어요."),
      ).toBeVisible();
      await expect(page.getByText("20m 이내").first()).toBeVisible();
      await page.getByLabel("위 식당과 다른 곳이 맞아요").check();
      await page.getByRole("button", { name: "장소 제안하기" }).click();
      await expect(
        page.getByRole("heading", { name: "장소를 제안했어요" }),
      ).toBeVisible();
    });

    await test.step("the proposal is listed as pending", async () => {
      await page.getByRole("link", { name: "내 제안 보기" }).click();
      const item = page.getByRole("listitem").filter({ hasText: name });
      await expect(item).toContainText("검수 대기");
    });

    await test.step("it is not on the public map", async () => {
      await page.goto(`/?z=14&q=${encodeURIComponent(name)}`);
      await expect(page.locator("#sheet-title")).toHaveText("식당 0곳");
    });

    await test.step("the proposer can review it right away", async () => {
      await page.goto("/me/places");
      await page
        .getByRole("listitem")
        .filter({ hasText: name })
        .getByRole("link", { name: "리뷰 쓰기" })
        .click();
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    });
  });

  test("searching a restaurant fills the form and moves the pin (C-83)", async ({
    page,
  }) => {
    await page.goto(AT_SICHEONG);
    await signInWithMagicLink(page, uniqueEmail("e2e-suggest-search"));
    const search = page.getByLabel("식당 검색어");
    await expect(search).toBeVisible();

    await test.step("no results and failures fall back to typing", async () => {
      await search.fill("없는식당이름");
      await search.press("Enter");
      await expect(page.getByText("검색 결과가 없어요.")).toBeVisible();
      await search.fill("오류검색");
      await page.getByRole("button", { name: "검색", exact: true }).click();
      await expect(page.getByText("검색하지 못했어요.")).toBeVisible();
    });

    await test.step("picking a result fills name, address, type and pin", async () => {
      await search.fill("혼밥테스트");
      await search.press("Enter");
      const results = page.getByRole("list", { name: "검색 결과" });
      await expect(results.getByRole("button")).toHaveCount(2);
      await results.getByRole("button", { name: /혼밥테스트라멘/ }).click();
      await expect(page.getByLabel("식당 이름")).toHaveValue("혼밥테스트라멘");
      await expect(page.getByLabel("주소")).toHaveValue(
        "서울특별시 중구 을지로 30",
      );
      await expect(page.getByLabel("음식 종류")).toHaveValue("japanese");
      await expect(page.locator('input[name="lat"]')).toHaveValue("37.5658");
      await expect(page.locator('input[name="lng"]')).toHaveValue("126.9812");
      await expect(
        page.getByRole("status").filter({ hasText: "정보로 채웠어요" }),
      ).toBeVisible();
    });

    await test.step("the filled fields stay editable", async () => {
      await page.getByLabel("식당 이름").fill("혼밥테스트라멘 2호점");
      await expect(page.getByLabel("식당 이름")).toHaveValue(
        "혼밥테스트라멘 2호점",
      );
    });
  });

  test("suggest page is touch-friendly without horizontal overflow", async ({
    page,
  }) => {
    await page.goto(AT_SICHEONG);
    await signInWithMagicLink(page, uniqueEmail("e2e-suggest-ux"));
    await expect(
      page.getByRole("heading", { name: "장소 제안" }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    // The form streams in after the page heading.
    await expect(page.getByLabel("식당 이름")).toBeVisible();
    for (const locator of [
      page.getByLabel("식당 이름"),
      page.getByLabel("주소"),
      page.getByLabel("음식 종류"),
      page.getByRole("button", { name: "장소 제안하기" }),
      page.getByRole("link", { name: "← 지도" }),
    ]) {
      const box = await locator.boundingBox();
      expect(box, String(locator)).not.toBeNull();
      expect(box!.height, String(locator)).toBeGreaterThanOrEqual(44);
    }
  });
});
