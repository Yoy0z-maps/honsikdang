import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Constant-time check of "Authorization: Bearer <secret>" (≥16 chars). */
export function hasBearer(
  request: Request,
  secret: string | undefined,
): boolean {
  const value = secret?.trim();
  if (!value || value.length < 16) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${value}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
