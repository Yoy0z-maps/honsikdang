import { expect, type Page } from "@playwright/test";

// Local Supabase captures auth emails in Mailpit instead of sending them.
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
}

async function latestMagicLink(email: string): Promise<string> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}&limit=1`,
    ).then((r) => r.json());
    const id = search.messages?.[0]?.ID;
    if (id) {
      const message = await fetch(`${MAILPIT}/api/v1/message/${id}`).then((r) =>
        r.json(),
      );
      const href = /href="([^"]+)"/.exec(message.HTML ?? "")?.[1];
      if (href) return href.replaceAll("&amp;", "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No magic link email for ${email}`);
}

/** Signs in through the real magic link flow; ends on the `next` page. */
export async function signInWithMagicLink(page: Page, email: string) {
  await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();
  await page.getByLabel("이메일").fill(email);
  await page.getByRole("button", { name: "로그인 링크 받기" }).click();
  await expect(page.getByText("로그인 링크를 보냈어요.")).toBeVisible();
  const link = await latestMagicLink(email);
  // The email points at the app origin the link was requested from.
  await page.goto(link);
}
