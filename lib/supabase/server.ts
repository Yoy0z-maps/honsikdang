import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Server-side client for anonymous public reads (publishable key, no
 * session). Does not touch cookies, so pages using it stay user-independent.
 */
export function getPublicServerSupabase(): SupabaseClient<Database> {
  const env = getPublicEnv();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Per-request client acting as the signed-in user (RLS applies). Create a
 * new one for every request; never share it.
 */
export async function createUserServerSupabase(): Promise<
  SupabaseClient<Database>
> {
  // Session handling reads the current time (token expiry). With Cache
  // Components, wait for the real request so prerendering never runs it.
  await connection();
  const env = getPublicEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies; proxy.ts refreshes the
            // session before rendering, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * The signed-in user's id, verified with getClaims() (checks the JWT
 * signature). Never use getSession() for authorization on the server.
 */
export async function getVerifiedUserId(
  client: SupabaseClient<Database>,
): Promise<string | null> {
  const { data, error } = await client.auth.getClaims();
  if (error || !data) return null;
  const sub = data.claims.sub;
  return typeof sub === "string" && sub.length > 0 ? sub : null;
}
