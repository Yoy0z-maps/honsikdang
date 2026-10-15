"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Browser client with the publishable key. The session lives in cookies
 * shared with the server (proxy.ts refreshes it). @supabase/ssr returns a
 * singleton in the browser, so this is cheap to call.
 */
export function getBrowserSupabase(): SupabaseClient<Database> {
  const env = getPublicEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
