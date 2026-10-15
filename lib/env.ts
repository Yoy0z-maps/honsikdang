import { z } from "zod";

// Client-safe configuration only. Server secrets (e.g. the Supabase secret key)
// belong in a separate module guarded by `import "server-only"`.
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1)
    .refine((key) => !key.startsWith("sb_secret_"), {
      message: "a secret key must never be exposed via NEXT_PUBLIC_*",
    }),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(
  source: Record<string, string | undefined>,
): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    // Report variable names and reasons only; never echo values.
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(
      `Invalid public environment variables (${problems}). See .env.example.`,
    );
  }
  return result.data;
}

/**
 * NAVER Maps Client ID, sent as the `ncpKeyId` script parameter. Optional:
 * without it the map shows a fallback and discovery still works. It is public
 * by design and restricted to the service URLs registered in the NCP console.
 */
export function getNaverMapKeyId(): string | null {
  const value = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID?.trim();
  return value && /^[A-Za-z0-9_-]{1,100}$/.test(value) ? value : null;
}

export function getPublicEnv(): PublicEnv {
  // NEXT_PUBLIC_* values are inlined at build time only when referenced
  // literally, so each variable is listed explicitly.
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
