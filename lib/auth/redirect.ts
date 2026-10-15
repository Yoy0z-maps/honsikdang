/**
 * Returns a same-origin path to continue to after sign-in, or "/".
 * Rejects absolute URLs, protocol-relative ("//evil.com") and backslash
 * tricks ("/\\evil.com") so the login flow cannot be used as an open redirect.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || raw.length > 512) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (/[\u0000-\u001f]/.test(raw)) return "/";
  try {
    const url = new URL(raw, "http://localhost");
    if (url.origin !== "http://localhost") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function loginPath(next: string): string {
  return `/login?next=${encodeURIComponent(safeNextPath(next))}`;
}
